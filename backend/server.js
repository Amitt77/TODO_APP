const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer'); // For handling file uploads
const fs = require('fs'); // For file system operations

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded images

// Serve static files from the "frontend" folder
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// MongoDB Connection
mongoose
  .connect('mongodb+srv://amit009:cwh2GpmhKHB7M582@todo.aw8vn.mongodb.net/')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));
// Multer Configuration for File Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (!fs.existsSync('uploads')) {
      fs.mkdirSync('uploads'); // Create the "uploads" directory if it doesn't exist
    }
    cb(null, 'uploads/'); // Save files in the "uploads" folder
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Unique filename
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB file size limit
});

// User Schema (Updated to include profileImage and bio)
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  profileImage: String, // Path to the uploaded profile image
  bio: String, // Optional bio field
});
const User = mongoose.model('User', userSchema);

// Task Schema (Updated to include image)
const taskSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  title: String,
  description: String,
  dueDate: Date,
  priority: String,
  status: { type: String, default: 'pending' },
  image: String, // Path to the uploaded image
});
const Task = mongoose.model('Task', taskSchema);

// Routes

// User Registration
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existingUser) {
      return res.status(400).send('Username or email already exists');
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const user = new User({ username, email, password: hashedPassword });
    await user.save();

    res.status(201).send('User registered');
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).send('Error registering user');
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).send('Invalid credentials');
    }

    // Compare the password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).send('Invalid credentials');
    }

    // Generate a JWT token
    const token = jwt.sign({ userId: user._id }, 'secret_key', { expiresIn: '1h' });
    res.json({ token });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send('Login error');
  }
});

// Get User Info (for profile)
app.get('/api/user', async (req, res) => {
  try {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).send('No token provided');

    // Verify the token
    const decoded = jwt.verify(token, 'secret_key');

    // Find the user by ID
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(404).send('User not found');
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).send('Error fetching user');
  }
});

// Update User Profile (including profile image)
// Update User Profile (including profile image)
// Update User Profile (including profile image)
app.put('/api/user', upload.single('profileImage'), async (req, res) => {
  try {
    const token = req.headers['authorization'];
    if (!token) {
      return res.status(401).send('No token provided');
    }

    // Bearer <token> format, so we need to extract the token
    const bearerToken = token.split(' ')[1]; // Token comes after "Bearer"

    if (!bearerToken) {
      return res.status(401).send('Invalid token');
    }

    // Verify the token
    const decoded = jwt.verify(bearerToken, 'secret_key');
    if (!decoded) {
      return res.status(401).send('Invalid token');
    }

    // Proceed with the user update logic
    const { username, email, bio } = req.body;
    const profileImage = req.file ? req.file.path : null;

    const updateData = {
      username,
      email,
      bio,
      ...(profileImage ? { profileImage } : {}),
    };

    const updatedUser = await User.findByIdAndUpdate(decoded.userId, updateData, { new: true });
    if (!updatedUser) {
      return res.status(404).send('User not found');
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).send('Invalid token');
    }
    res.status(500).send('Error updating profile');
  }
});



// Create Task (Updated to handle image upload)
app.post('/api/tasks', upload.single('image'), async (req, res) => {
  try {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).send('No token provided');

    // Verify the token
    const decoded = jwt.verify(token, 'secret_key');

    const { title, description, dueDate, priority, status } = req.body;

    // Create a new task
    const task = new Task({
      userId: decoded.userId,
      title,
      description,
      dueDate,
      priority,
      status: status || 'pending',
      image: req.file ? req.file.path : null, // Save the image path
    });
    await task.save();

    res.status(201).send('Task created');
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).send('Error creating task');
  }
});

// Get All Tasks
app.get('/api/tasks', async (req, res) => {
  try {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).send('No token provided');

    // Verify the token
    const decoded = jwt.verify(token, 'secret_key');

    // Find tasks for the user
    const tasks = await Task.find({ userId: decoded.userId });
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).send('Error fetching tasks');
  }
});

// Get Single Task by ID (for editing)
app.get('/api/tasks/:id', async (req, res) => {
  try {
    const token = req.headers['authorization'];
    if (!token) return res.status(401).send('No token provided');

    // Verify the token
    const decoded = jwt.verify(token, 'secret_key');

    // Find the task by ID and user ID
    const task = await Task.findOne({ _id: req.params.id, userId: decoded.userId });
    if (!task) {
      return res.status(404).send('Task not found');
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).send('Error fetching task');
  }
});

// Update Task (Updated to handle image upload)
app.put('/api/tasks/:id', upload.single('image'), async (req, res) => {
  try {
    const { title, description, dueDate, priority, status } = req.body;

    // Prepare update data
    const updateData = {
      title,
      description,
      dueDate,
      priority,
      ...(status ? { status } : {}),
    };

    // If a new image is uploaded, update the image path
    if (req.file) {
      updateData.image = req.file.path;
    }

    // Update the task in the database
    await Task.findByIdAndUpdate(req.params.id, updateData);
    res.send('Task updated');
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).send('Error updating task');
  }
});

// Delete Task
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    await Task.findByIdAndDelete(req.params.id);
    res.send('Task deleted');
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).send('Error deleting task');
  }
});

// Catch-All Route: Serve login.html as fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'login.html'));
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

///for message optoin
// Message Schema
const messageSchema = new mongoose.Schema({
  senderId: mongoose.Schema.Types.ObjectId, // ID of the sender
  receiverId: mongoose.Schema.Types.ObjectId, // ID of the receiver (for one-on-one chats)
  groupId: mongoose.Schema.Types.ObjectId, // ID of the group (for group chats)
  content: String, // Message content
  timestamp: { type: Date, default: Date.now }, // Timestamp of the message
});
const Message = mongoose.model('Message', messageSchema);

// Group Schema
const groupSchema = new mongoose.Schema({
  name: String, // Name of the group
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // Members of the group
  createdBy: mongoose.Schema.Types.ObjectId, // ID of the group creator
  timestamp: { type: Date, default: Date.now }, // Timestamp of group creation
});
const Group = mongoose.model('Group', groupSchema);

///
// Send a message (one-on-one or group)
app.post('/api/messages', async (req, res) => {
  try {
    const { senderId, receiverId, groupId, content } = req.body;

    // Validate input
    if (!senderId || !content || (!receiverId && !groupId)) {
      return res.status(400).send('Missing required fields');
    }

    // Create a new message
    const message = new Message({
      senderId,
      receiverId,
      groupId,
      content,
    });
    await message.save();

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).send('Error sending message');
  }
});

// Create a group
app.post('/api/groups', async (req, res) => {
  try {
    const { name, members, createdBy } = req.body;

    // Validate input
    if (!name || !members || !createdBy) {
      return res.status(400).send('Missing required fields');
    }

    // Create a new group
    const group = new Group({
      name,
      members,
      createdBy,
    });
    await group.save();

    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).send('Error creating group');
  }
});

// Get messages for a user (one-on-one or group)
app.get('/api/messages', async (req, res) => {
  try {
    const { userId, groupId } = req.query;

    // Validate input
    if (!userId) {
      return res.status(400).send('User ID is required');
    }

    // Fetch messages
    let messages;
    if (groupId) {
      // Fetch group messages
      messages = await Message.find({ groupId }).sort({ timestamp: 1 });
    } else {
      // Fetch one-on-one messages
      messages = await Message.find({
        $or: [
          { senderId: userId },
          { receiverId: userId },
        ],
      }).sort({ timestamp: 1 });
    }

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).send('Error fetching messages');
  }
});

// Get all groups for a user
app.get('/api/groups', async (req, res) => {
  try {
    const { userId } = req.query;

    // Validate input
    if (!userId) {
      return res.status(400).send('User ID is required');
    }

    // Fetch groups where the user is a member
    const groups = await Group.find({ members: userId });
    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).send('Error fetching groups');
  }
});


///socket.io
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server, {
  cors: {
    origin: '*', // Allow all origins (update this in production)
  },
});

// Socket.IO connection
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Join a room (one-on-one or group)
  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);
  });

  // Send a message
  socket.on('sendMessage', async (data) => {
    const { senderId, receiverId, groupId, content } = data;

    // Save the message to the database
    const message = new Message({
      senderId,
      receiverId,
      groupId,
      content,
    });
    await message.save();

    // Emit the message to the room
    const roomId = groupId || `${senderId}-${receiverId}`;
    io.to(roomId).emit('receiveMessage', message);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('A user disconnected:', socket.id);
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});