import { createComment, getComments } from '../models/Comment.js';
import { sendEmail } from '../services/emailServices.js';
import { getOwnerByCommentable } from '../utils/helpers.js';
import sanitizeHtml from 'sanitize-html';

export async function addComment(req, res, next) {
  try {
    const cleanContent = sanitizeHtml(req.body.content || '');
    const type = req.params.type || req.body.commentable_type; // 'task' or 'note'
    const id = req.params.id || req.body.commentable_id;
    const createdBy = req.user.id;

    if (!type || !id) {
      return res.status(400).json({ success: false, message: 'Missing commentable target' });
    }

    const commentId = await createComment({
      content: cleanContent,
      commentable_type: type,
      commentable_id: id,
      created_by: createdBy,
      parent_id: req.body.parent_id || null
    });

    // Optional side-effects (best-effort; ignore failures)
    try {
      const owner = await getOwnerByCommentable(type, id);
      if (owner?.email) {
        await sendEmail({ to: owner.email, subject: 'New comment on your item', text: `Comment ID: ${commentId}` });
      }
    } catch {
      // ignore side-effect errors
    }

    res.status(201).json({ success: true, commentId });
  } catch (error) {
    next(error);
  }
}

export async function fetchComments(req, res, next) {
  try {
    const type = req.params.type;
    const id = req.params.id;
    const comments = await getComments({ commentable_type: type, commentable_id: id });
    res.json({ success: true, comments });
  } catch (error) {
    next(error);
  }
} 