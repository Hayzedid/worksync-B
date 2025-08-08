import { createTag, addTagToTask, getTagsForTask, getAllTags } from '../models/Tag.js';

export async function createTagHandler(req, res, next) {
  try {
    const { name } = req.body;
    const tagId = await createTag(name);
    res.status(201).json({ success: true, tagId });
  } catch (error) {
    next(error);
  }
}

export async function addTagToTaskHandler(req, res, next) {
  try {
    const { id } = req.params; // task id
    const { tag_id } = req.body;
    await addTagToTask(id, tag_id);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function getTagsForTaskHandler(req, res, next) {
  try {
    const { id } = req.params; // task id
    const tags = await getTagsForTask(id);
    res.json({ success: true, tags });
  } catch (error) {
    next(error);
  }
}

export async function getAllTagsHandler(req, res, next) {
  try {
    const tags = await getAllTags();
    res.json({ success: true, tags });
  } catch (error) {
    next(error);
  }
} 