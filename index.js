const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.hhwjvgh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const booksCollection = client.db("bookRealmDB").collection('books');
    const borrowCollection = client.db("bookRealmDB").collection('Borrow');
    
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