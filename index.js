const express = require('express')
const app = express()
const cors = require('cors')
let mongoose = require('mongoose');
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.use(express.urlencoded({extended: true}));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

const mySecret = process.env['MONGO_URI']
mongoose.connect(
  mySecret, 
  { 
    useNewUrlParser: true, 
    useUnifiedTopology: true 
  }
);
const connection = mongoose.connection;
connection.on('error', console.error.bind(console, 'connection error'));
connection.once('open', ()=> console.log('mongodb connected...'));

let userSchema = new mongoose.Schema({
  username: String,
  exercises: [{ 
    description: String, 
    duration: Number,
    date: Date
  }]
});

let User = mongoose.model("ExerciseUser", userSchema);

app.post('/api/users', (req, res) => {
  let newUser = new User({
    username: req.body.username
  })
  newUser.save();
  return res.json({
    username: newUser.username,
    _id: newUser._id
  })
})

app.get('/api/users', async (req, res) => {
  let users = await User.find({});
  return res.send(users);
})

app.post('/api/users/:_id/exercises', async (req,res) => {
  let exObj = {
    _id: req.params._id,
    description: req.body.description,
    duration: parseInt(req.body.duration),
    date: req.body.date ? new Date(req.body.date).toDateString() : new Date().toDateString()
  }
  let user =  await User.findOneAndUpdate(
    {_id: exObj._id},
    {
     $push: { 
         exercises: {
          description: exObj.description,
          duration: parseInt(exObj.duration),
          date: exObj.date 
        }
      }
    },
    {new: true}
  )
  let returnObj = {
        username: user.username,
        description: exObj.description,
        duration: parseInt(exObj.duration),
        date: new Date(exObj.date).toDateString(),
        _id: String(exObj._id),
      };
  return res.json(returnObj);
})

app.get('/api/users/:_id/logs/:from?/:to?/:limit?', async (req, res) => {
  console.log(req.query.from, req.query.to, req.query.limit)
  let from = req.query.from ? Date.parse(req.query.from) : Date.parse('0001-01-01');
  let to = req.query.to ? Date.parse(req.query.to) : Date.parse('9999-12-31');
  let limit = Number(req.query.limit) || 10000;
  console.log(from, to)
  // let dFrom = req.query.from || '0000-00-00';
  // let dTo = req.query.to || '9999-99-99';
  // let limit = +req.query.limit || 10000;
  
  let user =  await User.findOne({
    _id: req.params._id
  });
  
  try {
    let logs = [];
    for(let exercise of user.exercises){
      if(exercise['date']){
        let log = {
            description: exercise.description,
            duration: exercise.duration,
            date: exercise.date.toDateString(),
          }
        console.log(limit > 0 && from <= Date.parse(exercise.date)
                && Date.parse(exercise.date) <= to)
        if(limit > 0 && from <= Date.parse(exercise.date)
                && Date.parse(exercise.date) <= to){
          logs.push(log);
        } 
        limit -= 1;
        console.log(log, "---", limit)
        // if(limit <= 0) break;
      }
    }
    let userLogs = {
      username: user.username,
      count: logs.length,
      _id: String(user._id),
      log: logs
    }
    console.log(userLogs)
    return res.send(userLogs);
  } catch (error) {
    res.json({
      error: "User not found"
    })
  }
  
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
