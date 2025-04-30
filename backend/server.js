const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const multer = require('multer'); // For handling file uploads
const fs = require('fs'); // For file system operations
const http = require('http');

// Secret key for JWT
const SECRET_KEY = 'your-secret-key-should-be-long-and-secure';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.static('frontend', {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));
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

// Authentication middleware
const authenticateToken = (req, res, next) => {
  // Get the authorization header
  const authHeader = req.headers['authorization'];

  // Log the received header for debugging
  console.log('Auth header received:', authHeader);

  // Check if header exists and has the correct format
  if (!authHeader) {
    return res.status(401).json({ message: 'No authorization header provided' });
  }

  // Extract token from "Bearer token" format
  let token;
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7); // Remove 'Bearer ' prefix
  } else {
    token = authHeader; // Try to use the token as-is if no prefix
  }

  // Log the extracted token (first 10 chars for security)
  console.log('Token extracted:', token?.substring(0, 10) + '...');

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  // Verify the token
  try {
    // Decode the token using your secret key
    const decoded = jwt.verify(token, SECRET_KEY);

    // Add the decoded user to the request object
    req.user = decoded;

    // Log successful verification
    console.log('Token verified successfully for user:', decoded.username || decoded.email || decoded.id);

    // Continue to the protected route
    next();
  } catch (error) {
    console.error('Token verification error:', error.message);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }

    return res.status(401).json({ message: 'Invalid token' });
  }
};

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

    // Create user object for token
    const userForToken = {
      id: user._id,
      email: user.email,
      username: user.username
    };

    // Generate JWT token
    const token = jwt.sign(userForToken, SECRET_KEY, { expiresIn: '7d' });

    // Return the token and user info
    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).send('Error registering user');
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    // Create user object to include in the token
    const userForToken = {
      id: user._id,
      email: user.email,
      username: user.username
    };

    // Generate JWT token with consistent options
    const token = jwt.sign(userForToken, SECRET_KEY, { expiresIn: '7d' });

    // Log token generation for debugging
    console.log('Token generated for user:', user.email);
    console.log('Token preview:', token.substring(0, 20) + '...');

    // Return success response with token
    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        profileImage: user.profileImage
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get User Info (for profile)
app.get('/api/user', authenticateToken, async (req, res) => {
  try {
    // The user ID is now available from the decoded token
    const userId = req.user.id;

    // Find the user by ID
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user' });
  }
});

// Update User Profile (including profile image)
// Update User Profile (including profile image)
app.put('/api/user', [authenticateToken, upload.single('profileImage')], async (req, res) => {
  try {
    // The user ID is available from the decoded token
    const userId = req.user.id;

    // Extract fields from request body
    const { username, email, bio } = req.body;
    const profileImage = req.file ? req.file.path : undefined;

    // Check for duplicate username (if provided)
    if (username) {
      const existingUserByUsername = await User.findOne({
        username,
        _id: { $ne: userId }, // Exclude the current user
      });
      if (existingUserByUsername) {
        return res.status(400).json({ message: 'Username is already taken' });
      }
    }

    // Check for duplicate email (if provided)
    if (email) {
      const existingUserByEmail = await User.findOne({
        email,
        _id: { $ne: userId }, // Exclude the current user
      });
      if (existingUserByEmail) {
        return res.status(400).json({ message: 'Email is already taken' });
      }
    }

    // Prepare update data
    const updateData = {
      ...(username && { username }),
      ...(email && { email }),
      ...(bio !== undefined && { bio }), // Allow empty bio
      ...(profileImage && { profileImage }),
    };

    // Update the user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    if (error.code === 11000) {
      // Handle MongoDB duplicate key error
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({ message: `${field} is already taken` });
    }
    res.status(500).json({ message: 'Error updating profile' });
  }
});

// Create Task (with image upload)
app.post('/api/tasks', [authenticateToken, upload.single('image')], async (req, res) => {
  try {
    const { title, description, dueDate, priority, status } = req.body;
    const userId = req.user.id;
    const task = new Task({
      userId,
      title,
      description,
      dueDate,
      priority,
      status: status || 'pending',
      image: req.file ? req.file.path : undefined,
    });
    await task.save();
    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Error creating task' });
  }
});

// Get All Tasks
app.get('/api/tasks', authenticateToken, async (req, res) => {
  try {
    // Get the user ID from the decoded token
    const userId = req.user.id;

    // Find tasks for the user
    const tasks = await Task.find({ userId });
    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Error fetching tasks' });
  }
});

// Get Single Task by ID (for editing)
app.get('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    // Get the user ID from the decoded token
    const userId = req.user.id;

    // Find the task by ID and user ID
    const task = await Task.findOne({ _id: req.params.id, userId });
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ message: 'Error fetching task' });
  }
});

// Update Task (with image upload)
app.put('/api/tasks/:id', [authenticateToken, upload.single('image')], async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, description, dueDate, priority, status } = req.body;
    const updateData = {
      ...(title && { title }),
      ...(description && { description }),
      ...(dueDate && { dueDate }),
      ...(priority && { priority }),
      ...(status && { status }),
    };
    if (req.file) {
      updateData.image = req.file.path;
    }
    const updatedTask = await Task.findOneAndUpdate(
      { _id: req.params.id, userId },
      updateData,
      { new: true }
    );
    if (!updatedTask) {
      return res.status(404).json({ message: 'Task not found or unauthorized' });
    }
    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Error updating task' });
  }
});

// Delete Task
app.delete('/api/tasks/:id', authenticateToken, async (req, res) => {
  try {
    // Get the user ID from the decoded token
    const userId = req.user.id;

    // Find and delete the task
    const deletedTask = await Task.findOneAndDelete({ _id: req.params.id, userId });

    if (!deletedTask) {
      return res.status(404).json({ message: 'Task not found or unauthorized' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Error deleting task' });
  }
});

// Send a message (one-on-one or group)
app.post('/api/messages', authenticateToken, async (req, res) => {
  try {
    const { receiverId, groupId, content } = req.body;
    const senderId = req.user.id; // Get from token

    // Validate input
    if (!content || (!receiverId && !groupId)) {
      return res.status(400).json({ message: 'Missing required fields' });
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
    res.status(500).json({ message: 'Error sending message' });
  }
});

// Create a group
app.post('/api/groups', authenticateToken, async (req, res) => {
  try {
    const { name, members } = req.body;
    const createdBy = req.user.id; // Get from token

    // Validate input
    if (!name || !members) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Make sure creator is included in members
    if (!members.includes(createdBy)) {
      members.push(createdBy);
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
    res.status(500).json({ message: 'Error creating group' });
  }
});

// Get messages for a user (one-on-one or group)
app.get('/api/messages', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // Get from token
    const { groupId } = req.query;

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
    res.status(500).json({ message: 'Error fetching messages' });
  }
});

// Get all groups for a user
app.get('/api/groups', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id; // Get from token

    // Fetch groups where the user is a member
    const groups = await Group.find({ members: userId });
    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ message: 'Error fetching groups' });
  }
});

// Catch-All Route: Serve login.html as fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'login.html'));
});

// Create HTTP server
const server = http.createServer(app);

// Socket.IO setup
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
    try {
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
    } catch (error) {
      console.error('Error processing socket message:', error);
    }
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