// routes/eventRoutes.js
import express from 'express'
import * as eventController from '../controllers/eventController.js'
import authenticateToken from '../middleware/auth.js'

const router = express.Router()

router.use(authenticateToken)

router.post('/', authenticateToken, eventController.create)
router.get('/', authenticateToken, eventController.getAll)
router.get('/:id', authenticateToken, eventController.getById)
router.put('/:id', authenticateToken, eventController.update)
router.delete('/:id', authenticateToken, eventController.remove)

export default router
