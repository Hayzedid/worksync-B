import express from 'express';
import { body, validationResult } from 'express-validator';
import Newsletter from '../models/Newsletter.js';

const router = express.Router();

// Validation middleware
const validateEmail = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

// Subscribe to newsletter
router.post('/subscribe', validateEmail, async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg,
        errors: errors.array()
      });
    }

    const { email, firstName, lastName } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    // Check if email already exists
    const existingSubscriber = await Newsletter.isSubscribed(email);
    
    if (existingSubscriber) {
      if (existingSubscriber.status === 'active') {
        return res.status(409).json({
          success: false,
          message: 'This email is already subscribed to our newsletter'
        });
      } else {
        // Reactivate unsubscribed user
        await Newsletter.subscribe(email, {
          firstName,
          lastName,
          source: 'website',
          ipAddress,
          userAgent
        });
      }
    } else {
      // Create new subscriber
      await Newsletter.subscribe(email, {
        firstName,
        lastName,
        source: 'website',
        ipAddress,
        userAgent
      });
    }

    // Send welcome email
    try {
      await Newsletter.sendWelcomeEmail(email, { firstName, lastName });
    } catch (emailError) {
      console.error('Welcome email failed:', emailError);
      // Don't fail the subscription if email fails
    }

    // Get updated subscriber count
    const subscriberCount = await Newsletter.getSubscriberCount();

    // Log subscription
    console.log(`New newsletter subscription: ${email}`);
    console.log(`Total subscribers: ${subscriberCount}`);

    res.status(200).json({
      success: true,
      message: 'Successfully subscribed to newsletter!',
      data: {
        email: email.toLowerCase(),
        subscribedAt: new Date().toISOString(),
        totalSubscribers: subscriberCount
      }
    });

  } catch (error) {
    console.error('Newsletter subscription error:', error);
    
    if (error.message === 'Email already subscribed') {
      return res.status(409).json({
        success: false,
        message: 'This email is already subscribed to our newsletter'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error. Please try again later.'
    });
  }
});

// Check subscription status
router.get('/status', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email parameter is required'
      });
    }

    const subscriber = await Newsletter.getSubscriberByEmail(email);
    const totalSubscribers = await Newsletter.getSubscriberCount();

    res.status(200).json({
      success: true,
      data: {
        email: email.toLowerCase(),
        isSubscribed: !!subscriber && subscriber.status === 'active',
        subscribedAt: subscriber?.subscribed_at || null,
        status: subscriber?.status || null,
        totalSubscribers
      }
    });

  } catch (error) {
    console.error('Newsletter status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Unsubscribe from newsletter
router.post('/unsubscribe', validateEmail, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg
      });
    }

    const { email } = req.body;

    const result = await Newsletter.unsubscribe(email);
    const totalSubscribers = await Newsletter.getSubscriberCount();

    console.log(`Newsletter unsubscription: ${email}`);
    console.log(`Remaining subscribers: ${totalSubscribers}`);

    res.status(200).json({
      success: true,
      message: 'Successfully unsubscribed from newsletter',
      data: {
        totalSubscribers
      }
    });

  } catch (error) {
    console.error('Newsletter unsubscription error:', error);
    
    if (error.message === 'Email not found or already unsubscribed') {
      return res.status(404).json({
        success: false,
        message: 'Email not found in our newsletter list'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get all subscribers (admin endpoint)
router.get('/subscribers', async (req, res) => {
  try {
    // In production, you'd want to add authentication/authorization here
    const { limit = 100, offset = 0 } = req.query;
    
    const subscribers = await Newsletter.getActiveSubscribers(parseInt(limit), parseInt(offset));
    const totalCount = await Newsletter.getSubscriberCount();
    
    res.status(200).json({
      success: true,
      data: {
        subscribers,
        totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Get subscribers error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// Get newsletter statistics (admin endpoint)
router.get('/stats', async (req, res) => {
  try {
    // In production, you'd want to add authentication/authorization here
    const stats = await Newsletter.getStats();
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get newsletter stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export default router;
