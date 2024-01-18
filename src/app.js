import express from "express";
import mongoose from 'mongoose';
import handlebars from 'express-handlebars' 
import { Server } from 'socket.io'
import productRouter from "./routes/productRoutes.js";
import cartRouter from "./routes/cartsRoutes.js";
import messagesRouter from "./routes/messagesRoutes.js";
import { ProductMongoManager } from "./dao/managerDB/ProductMongoManager.js";
import { MessageMongoManager } from "./dao/managerDB/MessageMongoManager.js";
import viewRoutes from './routes/viewsRoutes.js'

//configuraciones

const PORT = 8080;
const app = express();
const productManager = new ProductMongoManager();
const messageManager = new MessageMongoManager()

app.use(express.json())
app.use(express.urlencoded({ extended: true}))
app.use(express.static('public'))

mongoose.connect("mongodb+srv://nsalamanca:sammy123@cluster0.rwbs3lx.mongodb.net/ecommerce")

//handlebars
const hbs = handlebars.create({
  runtimeOptions: {
      allowProtoPropertiesByDefault: true
  }
});

app.engine('handlebars',hbs.engine) 
app.set('views','src/views')
app.set('view engine', 'handlebars')
app.use('/', viewRoutes) //Configuracion de las vistas handlebars

//APIS

app.use('/api/products', productRouter)
app.use('/api/carts', cartRouter)
app.use('/api/messages', messagesRouter)

//servidor

const httpServer = app.listen(PORT, () => {
  console.log(`listening on port ${PORT}`);
});

const socketServer = new Server(httpServer) 

const messages=[]

socketServer.on("connection", async (socket)=>{
  console.log("New Cliente Online");
  
  socket.on('addProd', async prod => {
    try {
     const rdo = await productManager.addProduct(prod)
     if (rdo.message==="OK")
     {
      const resultado = await productManager.getProducts();
      if (resultado.message==="OK")
      {
        socket.emit("getAllProducts",resultado.rdo )  
      }
     }
     return rdo
    } catch (error) {
      console.log("Error when registering a product: ", error)
    }
	})

  socket.on('delProd', async id => {
    const deleted=await productManager.deleteProduct(id)
    if (deleted.message==="OK")
    {
      const resultado = await productManager.getProducts();
      if (resultado.message==="OK")
      {
        socket.emit("getAllProducts",resultado.rdo )  
      }
    }
    else
      console.log("Error deleting a product: ", deleted.rdo)
  });

  socket.on('message', data=>{
    messages.push(data)
    messageManager.addMessage(data)
    socketServer.emit('messageLogs', messages)
  })

  socket.on('newUser', data =>{
    socket.emit('newConnection', 'A new user logged in - ' + data)
    socket.broadcast.emit('notification', data)
  })

});

