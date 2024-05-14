const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PORT || 5000;

app.use(cors({
  origin:[
    'http://localhost:5173'
],
credentials: true}
));
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hhwjvgh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const logger = (req, res, next) =>{
  console.log('log info: ', req.method, req.url)
  next()
}

const verifyToken = (req,res,next)=>{
  const token = req.cookies?.token
  // console.log('token in the middleware', token)
  if(!token){
      return res.status(401).send({message: 'Unauthorized Access'})
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decode) =>{
      if(err){
          return res.status(401).send({message: 'Unauthorized Access'})
      }
      req.user = decode
      console.log(decode)
      next()
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const booksCollection = client.db("bookRealmDB").collection('books');
    const borrowCollection = client.db("bookRealmDB").collection('Borrow');

    // auth related api
    app.post('/jwt', logger, async(req,res)=>{
      const user = req.body
      console.log('user for token', user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{
          expiresIn:'1h'
      })
      
      res.cookie('token', token, {
          httpOnly: true,
          secure: true,
          sameSite: 'none'
      })
      .send({success: true})
  })


  app.post('/logout', async(req,res)=>{
    const user = req.body
    res.clearCookie('token', {maxAge:0}).send({success:true})
  })
    
    app.get('/books', async(req,res) =>{
      const cursor = booksCollection.find();
      const result = await cursor.toArray();

      res.send(result)
  })
  
  app.get('/books/:id', async(req,res)=>{
    const id = req.params.id;
    const query = {_id: new ObjectId(id)}
    const result = await booksCollection.findOne(query)
    res.send(result)
  })

  app.post('/books', async(req,res) =>{
    const newBook = req.body;
    console.log(newBook)
    const result = await booksCollection.insertOne(newBook);
    res.send(result)
  })

  app.get('/borrow',logger, verifyToken, async (req, res) => {
    console.log(req.query.email);
    if(req.user.email !== req.query.email){
        return res.status(403).send({message: "Forbidden Access"})
    }
    let query = {};
    if (req.query?.email) {
        query = { userEmail: req.query.email }
    }
    const result = await borrowCollection.find(query).toArray();
    res.send(result);
})
  
  app.post('/borrow', async(req,res) =>{
    try{      
      const { bookId, userName, userEmail, borrowDate, returnDate } = req.body;
      const borrowBooks = await borrowCollection.find({userEmail}).toArray()
      console.log(borrowBooks.length)
      if(borrowBooks.length >= 3){
        return res.status(400).send({message: "You already have 3 borrowed books"})
      }
      const isExist = await borrowCollection.findOne({bookId})
      if(isExist){
        return res.status(400).send({message: "You already borrowed this book"})
      }
      const book = await booksCollection.findOne({_id: new ObjectId(bookId)})
      await booksCollection.updateOne({_id: new ObjectId(bookId)}, {
        $set:{
          bookQuantity: (parseInt(book.bookQuantity)-1).toString()
        }
      })
      const result = await borrowCollection.insertOne({ bookId, userName, userEmail, borrowDate, returnDate });
      res.send(result)
    }
    catch(error){
      res.status(500).send({message: error.message}) 
    }
  })

  app.delete('/borrow/:id', async(req,res)=>{
    const {id} = req.params
    const query = {bookId : id}
    const result = await borrowCollection.deleteOne(query)
    console.log({result})
    if(result.acknowledged && result.deletedCount === 1){
      const book = await booksCollection.findOne({_id: new ObjectId(id)})
      await booksCollection.updateOne({_id: new ObjectId(id)}, {
        $set:{
          bookQuantity: (parseInt(book.bookQuantity)+1).toString()
        }
      })
      res.status(200).send({success: true, message:"Delete Successfully"})
    }
    else if (result.acknowledged && result.deletedCount === 0){
      res.status(200).send({success: false, message:"No Data Deleted"})
    }
    else{
      res.send(400).send({message: "Invalid Request"})
    }
  })

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req,res) =>{
    res.send("Book Realm Website running ")
})

app.listen(port,() => {
    console.log(`Server Running on port: ${port}`)
})