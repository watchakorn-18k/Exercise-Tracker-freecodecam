const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();

app.use(cors())
app.use(express.static('public'))
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // support encoded bodies

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// Define Schema and Models
const { Schema } = mongoose;

const exerciseSchema = new Schema({
  user_id: {type: String, require:true},
  description: String,
  duration: Number,
  date: { type: Date, default: Date.now }
});

const userSchema = new Schema({
  username: String,
});

const User = mongoose.model('User', userSchema);

const Exercise = mongoose.model('Exercise', exerciseSchema);


app.get('/', async (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body;
    const newUser = new User({ username });
    await newUser.save();
    res.json(newUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '_id username');
    res.json(users);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const { _id } = req.params;
    const { description, duration, date } = req.body;
    const user = await User.findById(_id);
    if (!user) throw new Error('User not found');

    const newExercise = new Exercise({
      user_id:user._id,
      description,
      duration,
      date: date ? new Date(date) : new Date()
    });
    await newExercise.save()
    res.json({
      _id: user._id,
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: new Date(newExercise.date).toDateString()
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  try {
    const id = req.params._id;
    console.log("test : ", id)
    const user = await User.findById(id);
    if (!user) throw new Error('User not found');

    let { from, to, limit } = req.query;
    let dataObj = {}
    if (from) {
      dataObj["$gte"] = new Date(from)
    }
    if (to) {
      dataObj["$lte"] = new Date(to)
    }
    let filter = {
      "user_id": id
    }
    if (from || to) {
      filter.date = dataObj;
    }

    let exercisesQuery = Exercise.find(filter);

    if (limit) {
      exercisesQuery = exercisesQuery.limit(parseInt(limit));
    }

    const exercises = await exercisesQuery;

    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }));

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});





const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
