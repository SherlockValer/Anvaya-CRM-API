const mongoose = require('mongoose');

// Tag Schema
const tagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tag name is required'],
    unique: true,  // Ensures that each tag name is unique
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const Tag = mongoose.model('Tag', tagSchema)

module.exports = Tag ;
