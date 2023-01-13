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
const schemaParticipants = joi.object({
    name: joi.string().min(1).required()
});

// const schemaMessages = joi.object({
//     name: joi.string().min(1).required()
// });

// Rotas
// POST /participants
app.post('/participants', async (req, res) => {

    const participant = req.body;

    //object format validation
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
    

});

// POST /messages
app.post('/participants', (req, res) => {

});

// GET /messages
app.get('/participants', (req, res) => {

});

// POST /status
app.post('/participants', (req, res) => {

});



app.listen(PORT, () => console.log(`Listening on port ${PORT}`));