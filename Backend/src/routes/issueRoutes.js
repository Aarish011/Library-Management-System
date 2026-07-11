const express = require('express');
const router = express.Router();
const issueController = require('../controllers/issueController');
const { protect } = require('../middleware/auth');

router.post('/', protect, issueController.createIssue);
router.get('/', protect, issueController.getMyIssues);
router.get('/:issueId', protect, issueController.getMyIssueById);

module.exports = router;
