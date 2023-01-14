import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import dayjs from 'dayjs';
import joi from 'joi';
import { MongoClient } from "mongodb";

dotenv.config();
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

//mongoDB connection
const mongoClient = new MongoClient(process.env.DATABASE_URL);
//db
let db;

mongoClient.connect().then(() => {
    db = mongoClient.db();
});

// Schemas
//Participants validation schema
const schemaParticipants = joi.object({
    name: joi.string().min(1).required()
});

//Messages validation schema
const schemaMessages = joi.object({
    from: joi.string().required(),
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.string().valid("message", "private_message").required(),
    time: joi.string().required()
});

// Rotas
// POST /participants
app.post('/participants', async (req, res) => {

    const participant = req.body;

    //object format validation schema
    const valid = schemaParticipants.validate(participant);

    if(valid.error){
        const err = valid.error.details.map((detail) => detail.message);
        return res.status(422).send(err);
    }

    try {
        //check if the participant already exists
        const alreadyExists = await db.collection('participants').findOne({ name: participant.name });

        //if the participant name already exists, return status 409
        if(alreadyExists){
            return res.send(409);
        }

        //inserting the participant in the database
        await db.collection('participants').insertOne({
            name: participant.name,
            lastStatus: Date.now()
        })

        //sending a message to the server informing that the participant entered the chat
        await db.collection('messages').insertOne({
            from: participant.name,
            to: 'Todos',
            text: 'entra na sala...',
            type: 'status',
            time: dayjs().format('HH:mm:ss')
        })

        //send status 201 - 'CREATED'
        res.send(201);

    } catch (err) {
        //error return
        res.status(500).send(err.message)
    }

});

// GET /participants
app.get('/participants', async (req, res) => {

    try{
        //find all participants in the participants collection
        const participantsList = await db.collection('participants').find().toArray();
        //verify if list is empty
        if(!participantsList){
            return res.status(404).send('Não há nenhum participante no chat!')
        }

        res.send(participantsList);

    } catch (err) {
        //error return
        res.status(500).send(err.message);
    }

});

// POST /messages
app.post('/messages', async (req, res) => {
    const { to, text, type } = req.body;
    const { user } = req.headers;
    console.log(user);

    //message object to post
    const msg = {
        from: user,
        to: to,
        text: text,
        type: type,
        time: dayjs().format('HH:mm:ss')
    }

    console.log(msg);

    //object format validation schema
    const valid = schemaMessages.validate(msg);
    
    if(valid.error){
        const err = valid.error.details.map((detail) => detail.msg);
        return res.status(422).send(err);
    }

    try{

        //verify if user exists in the database
        const userExists = await db.collection('participants').findOne({ name: user });

        //participant does not exist
        if(!userExists){
            return res.send(422);
        }

        await db.collection('messages').insertOne(msg)

        res.send(201);

    } catch (err) {
        //error return
        res.status(500).send(err.message);
    }
});

// GET /messages
app.get('/messages', async (req, res) => {

    const limit = parseInt(req.query.limit);
    const { user } = req.headers;

    try { 

        //get all messages
        const allMessages = await db.collection('messages').find().toArray();
        //filter messages that should be visible to user
        const filteredMsgs = allMessages.filter((msg) => {
            //if message was sent too all users (type === 'message') or it was a private message sent or sent to the user, filter it
            if(msg.type === 'message' || msg.type === 'status' || ((msg.to === user || msg.from === user) && msg.type === 'private_message')){
                return msg;
            }
        });

        if((limit < 0 || limit === 0)){
            return res.send(422);
        }

        if(limit !== undefined && !isNaN(limit)){

            return res.send(filteredMsgs.slice(-limit).reverse());

        } else {

            return res.send((filteredMsgs).reverse());

        }

    } catch (err) { 
        //error return
        res.status(500).send(err.message);
    }

});

// POST /status
app.post('/status', async (req, res) => {

    const { user } = req.headers;

    try {

        const userExists = await db.collection('participants').findOne({ name:user });

        //if the participant does not exist, return error 404 not found
        if(!userExists){
            return res.send(404);
        }
        //if the participant exists, update lastStatus atributte
        await db.collection('participants').updateOne({ name: user }, {$set: {lastStatus: Date.now()}});

        return res.send(200);

    } catch (err) {
        //error return
        res.status(500).send(err.message);
    }

});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));