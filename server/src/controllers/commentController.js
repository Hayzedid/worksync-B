import { createComment, getComments } from '../models/Comment.js';
import { io } from '../server.js';
import { sendEmail } from '../services/emailServices.js';
import sanitizeHtml from 'sanitize-html';

export async function addComment(req, res, next) {
  try {
    const cleanContent = sanitizeHtml(req.body.content || '');
    const { type, id } = req.params; // type: 'task' or 'note'
    const created_by = req.user.id;
    const comment = await createComment({
      content: cleanContent,
      commentable_type: req.params.type,
      commentable_id: req.params.id,
      created_by: req.user.id,
      parent_id: req.body.parent_id || null
    });
    // Fetch the owner of the commentable item (implement getOwnerByCommentable in helpers or relevant model)
    const { userId, email } = await getOwnerByCommentable(req.params.type, req.params.id);
    // Emit real-time event
    io.to(userId.toString()).emit('notification', { type: 'commentAdded', comment });
    // Send email notification
    await sendEmail(email, 'New comment on your item', `Comment: ${comment.content}`);
    res.status(201).json({ message: 'Comment added', comment });
  } catch (error) {
    next(error);
  }
}

export async function fetchComments(req, res, next) {
  try {
    const { type, id } = req.params;
    const comments = await getComments({ commentable_type: type, commentable_id: id });
    res.json({ success: true, comments });
  } catch (error) {
    next(error);
  }
} 