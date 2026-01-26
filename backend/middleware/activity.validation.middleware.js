<<<<<<< HEAD
/**
 * -------------------- Activity Validation Middleware --------------------
 */

/**
 * Validate activity creation
 * Ensures required fields are present and valid
 */
const validateActivity = (req, res, next) => {
  const { title, startTime, endTime, date } = req.body;

  // Title is required
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Title is required and must be a non-empty string'
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

  // Date validation (if provided)
  if (date) {
    const activityDate = new Date(date);
    if (isNaN(activityDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }
  }

  // All validations passed
  next();
};

/**
 * Validate activity update
 * Only validates fields that are being updated
 */
const validateActivityUpdate = (req, res, next) => {
  const { title, startTime, endTime, date } = req.body;

  // Title validation (if provided)
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Title must be a non-empty string'
      });
    }
  }

  // Time validation (if both provided)
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

  // Date validation (if provided)
  if (date !== undefined) {
    const activityDate = new Date(date);
    if (isNaN(activityDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }
  }

  // All validations passed
  next();
};

/**
 * Export validation middleware
 * Used in activity routes
 */
module.exports = {
  validateActivity,
  validateActivityUpdate
=======
/**
 * -------------------- Activity Validation Middleware --------------------
 */

/**
 * Validate activity creation
 * Ensures required fields are present and valid
 */
const validateActivity = (req, res, next) => {
  const { title, startTime, endTime, date } = req.body;

  // Title is required
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Title is required and must be a non-empty string'
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

  // Date validation (if provided)
  if (date) {
    const activityDate = new Date(date);
    if (isNaN(activityDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }
  }

  // All validations passed
  next();
};

/**
 * Validate activity update
 * Only validates fields that are being updated
 */
const validateActivityUpdate = (req, res, next) => {
  const { title, startTime, endTime, date } = req.body;

  // Title validation (if provided)
  if (title !== undefined) {
    if (typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Title must be a non-empty string'
      });
    }
  }

  // Time validation (if both provided)
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

  // Date validation (if provided)
  if (date !== undefined) {
    const activityDate = new Date(date);
    if (isNaN(activityDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format'
      });
    }
  }

  // All validations passed
  next();
};

/**
 * Export validation middleware
 * Used in activity routes
 */
module.exports = {
  validateActivity,
  validateActivityUpdate
>>>>>>> 0007615a5a7317e8689fc9727726ee86c5585786
};