const validateActivity = (req, res, next) => {
  const { title, startTime, endTime, date } = req.body;
  // Title is required
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Title is required'
    });
  }
  // Start time is required
  if (!startTime) {
    return res.status(400).json({
      success: false,
      message: 'Start time is required'
    });
  }
  // End time is required
  if (!endTime) {
    return res.status(400).json({
      success: false,
      message: 'End time is required'
    });
  }
  // Validate time logic: end time must be after start time
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (isNaN(start.getTime())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid start time format'
    });
  }

  if (isNaN(end.getTime())) {
    return res.status(400).json({
      success: false,
      message: 'Invalid end time format'
    });
  }

  if (start >= end) {
    return res.status(400).json({
      success: false,
      message: 'End time must be after start time'
    });
  }

  // Date validation
  if (date) {
    const activityDate = new Date(date);
    if (isNaN(activityDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }
  }
  next();
};

//Validate activity update
 //Only validates fields that are being updated
const validateActivityUpdate = (req, res, next) => {
  const { title, startTime, endTime, date } = req.body;
  // Title validation
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Title must be a non-empty string'
      });
    }
  }
  // Time validation
  if (startTime && endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (isNaN(start.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start time format'
      });
    }
    if (isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid end time format'
      });
    }

    if (start >= end) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time'
      });
    }
  }

  // Individual time format validation
  if (startTime && !endTime) {
    const start = new Date(startTime);
    if (isNaN(start.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start time format'
      });
    }
  }

  if (endTime && !startTime) {
    const end = new Date(endTime);
    if (isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid end time format'
      });
    }
  }

  // Date validation
  if (date !== undefined) {
    const activityDate = new Date(date);
    if (isNaN(activityDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }
  }
  next();
};
module.exports = {
  validateActivity,
  validateActivityUpdate
}


