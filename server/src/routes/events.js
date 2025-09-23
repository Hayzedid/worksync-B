// routes/eventRoutes.js
import express from 'express'
import * as eventController from '../controllers/eventController.js'
import authenticateToken from '../middleware/auth.js'

const router = express.Router()

router.use(authenticateToken)

router.post('/', eventController.validateEvent, eventController.validateRequest, eventController.create)
router.get('/', eventController.getAll)
router.get('/:id', eventController.getById)
router.put('/:id', eventController.validateEvent, eventController.validateRequest, eventController.update)
router.patch('/:id', eventController.update)
router.delete('/:id', eventController.remove)

export default router
