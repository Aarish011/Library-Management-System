const CareerApplication = require('../models/CareerApplication');

const allowedStatuses = ['new', 'reviewing', 'shortlisted', 'rejected', 'contacted'];

function normalizeSubjects(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(',');
  return [];
}

exports.createApplication = async (req, res) => {
  try {
    const subjects = normalizeSubjects(req.body.subjects)
      .map((subject) => String(subject).trim())
      .filter(Boolean)
      .slice(0, 8);

    const application = await CareerApplication.create({
      name: req.body.name,
      email: req.body.email,
      phone: String(req.body.phone || '').replace(/\D/g, '').slice(-10),
      city: req.body.city,
      qualification: req.body.qualification,
      subjects,
      teachingInterest: req.body.teachingInterest,
      experience: req.body.experience,
      availability: req.body.availability,
      preferredMode: req.body.preferredMode,
      currentOccupation: req.body.currentOccupation,
      expectedPay: req.body.expectedPay,
      message: req.body.message,
    });

    res.status(201).json({
      success: true,
      message: 'Career application submitted successfully',
      data: application,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to submit career application',
    });
  }
};

exports.getAdminApplications = async (req, res) => {
  try {
    const filter = {};
    if (allowedStatuses.includes(req.query.status)) filter.status = req.query.status;
    if (req.query.search) {
      const search = new RegExp(String(req.query.search).trim(), 'i');
      filter.$or = [
        { name: search },
        { email: search },
        { phone: search },
        { city: search },
        { subjects: search },
        { teachingInterest: search },
      ];
    }

    const applications = await CareerApplication.find(filter)
      .sort({ createdAt: -1 })
      .limit(300);

    res.json({ success: true, data: applications });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to load career applications',
    });
  }
};

exports.updateAdminApplication = async (req, res) => {
  try {
    const updates = {};
    if (allowedStatuses.includes(req.body.status)) updates.status = req.body.status;
    if (req.body.adminNote !== undefined) updates.adminNote = req.body.adminNote;

    const application = await CareerApplication.findByIdAndUpdate(
      req.params.applicationId,
      updates,
      { new: true, runValidators: true }
    );

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Career application not found',
      });
    }

    res.json({
      success: true,
      message: 'Career application updated',
      data: application,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to update career application',
    });
  }
};
