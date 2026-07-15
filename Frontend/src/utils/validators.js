export const validateRegister = (data) => {
  const errors = {};

  // Name validation
  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRegex.test(data.email)) {
    errors.email = 'Please enter a valid email address';
  }

  // Phone validation
  const phoneRegex = /^[0-9]{10}$/;
  if (!data.phone || !phoneRegex.test(data.phone)) {
    errors.phone = 'Please enter a valid 10-digit phone number';
  }

  // Password validation
  if (!data.password || data.password.length < 6) {
    errors.password = 'Password must be at least 6 characters';
  }

  // Confirm password
  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match';
  }

  // Gender validation
  if (!data.gender) {
    errors.gender = 'Please select your gender';
  }

  // Preparation validation
  if (!data.preparation) {
    errors.preparation = 'Please select what you are preparing for';
  }

  if (!data.profilePicture) {
    errors.profilePicture = 'Profile photo is required';
  } else if (!data.profilePicture.type?.startsWith('image/')) {
    errors.profilePicture = 'Please upload an image file';
  } else if (data.profilePicture.size > 5 * 1024 * 1024) {
    errors.profilePicture = 'Profile photo must be smaller than 5 MB';
  }

  return errors;
};

export const validateLogin = (data) => {
  const errors = {};

  if (!data.email) {
    errors.email = 'Email is required';
  }

  if (!data.password) {
    errors.password = 'Password is required';
  }

  return errors;
};
