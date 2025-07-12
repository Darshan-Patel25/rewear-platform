const express = require('express')
const { body, validationResult } = require('express-validator')
const Swap = require('../models/Swap')
const Item = require('../models/Item')
const User = require('../models/User')
const { auth } = require('../middleware/auth')

const router = express.Router()

// @route   POST /api/swaps
// @desc    Create a new swap request
// @access  Private
router.post('/', auth, [
  body('type').isIn(['direct-swap', 'point-redemption']).withMessage('Invalid swap type'),
  body('requestedItem').isMongoId().withMessage('Invalid requested item ID'),
  body('offeredItem').optional().isMongoId().withMessage('Invalid offered item ID'),
  body('pointsOffered').optional().isInt({ min: 1 }).withMessage('Points offered must be a positive integer'),
  body('message').optional().isLength({ max: 500 }).withMessage('Message cannot exceed 500 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      })
    }

    const { type, requestedItem, offeredItem, pointsOffered, message } = req.body

    // Get the requested item
    const requestedItemDoc = await Item.findById(requestedItem).populate('owner')
    if (!requestedItemDoc) {
      return res.status(404).json({ message: 'Requested item not found' })
    }

    // Check if item is available
    if (requestedItemDoc.availability !== 'available') {
      return res.status(400).json({ message: 'Item is not available for swap' })
    }

    // Can't swap with yourself
    if (requestedItemDoc.owner._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot swap with yourself' })
    }

    // Validate swap type requirements
    if (type === 'direct-swap') {
      if (!offeredItem) {
        return res.status(400).json({ message: 'Offered item is required for direct swap' })
      }

      // Verify offered item exists and belongs to requester
      const offeredItemDoc = await Item.findById(offeredItem)
      if (!offeredItemDoc) {
        return res.status(404).json({ message: 'Offered item not found' })
      }

      if (offeredItemDoc.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: 'You can only offer your own items' })
      }

      if (offeredItemDoc.availability !== 'available') {
        return res.status(400).json({ message: 'Offered item is not available' })
