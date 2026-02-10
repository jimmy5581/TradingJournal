if (!API.checkAuth()) {
  throw new Error('Not authenticated');
}

let originalProfile = {};

const loadProfile = async () => {
  try {
    const response = await API.apiCall('/account/profile');
    originalProfile = { ...response.data };
    populateForm(response.data);
  } catch (error) {
    console.error('Error loading profile:', error);
    API.showNotification('Failed to load profile', 'error');
  }
};

const populateForm = (data) => {
  document.getElementById('firstName').value = data.firstName || '';
  document.getElementById('lastName').value = data.lastName || '';
  document.getElementById('email').value = data.email || '';
  document.getElementById('phone').value = data.phone || '';
  document.getElementById('country').value = data.country || '';
  document.getElementById('timezone').value = data.timezone || '';
  document.getElementById('location').value = data.location || '';
  document.getElementById('role').value = data.role || 'Trader';
  
  const fullName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'User Name';
  document.getElementById('userName').textContent = fullName;
  document.getElementById('userEmail').textContent = data.email || '';
  
  if (data.joinedAt) {
    document.getElementById('joinedAt').value = new Date(data.joinedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  if (data.avatarUrl) {
    document.getElementById('avatarPreview').src = data.avatarUrl;
    document.getElementById('avatarPreview').style.display = 'block';
    document.getElementById('avatarPlaceholder').style.display = 'none';
  } else {
    const initials = ((data.firstName || '').charAt(0) + (data.lastName || '').charAt(0)).toUpperCase() || 'U';
    document.getElementById('avatarInitials').textContent = initials;
    document.getElementById('avatarPreview').style.display = 'none';
    document.getElementById('avatarPlaceholder').style.display = 'flex';
  }
};

const handleSave = async (e) => {
  e.preventDefault();
  
  const saveBtn = document.getElementById('saveBtn');
  const saveBtnText = document.getElementById('saveBtnText');
  const saveBtnLoading = document.getElementById('saveBtnLoading');
  
  saveBtn.disabled = true;
  saveBtnText.style.display = 'none';
  saveBtnLoading.style.display = 'inline';

  try {
    const profileData = {
      firstName: document.getElementById('firstName').value,
      lastName: document.getElementById('lastName').value,
      phone: document.getElementById('phone').value,
      country: document.getElementById('country').value,
      timezone: document.getElementById('timezone').value,
      location: document.getElementById('location').value
    };

    const response = await API.apiCall('/account/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData)
    });

    originalProfile = { ...response.data };
    populateForm(response.data);
    API.showNotification('Profile updated successfully', 'success');
  } catch (error) {
    console.error('Error updating profile:', error);
    API.showNotification('Failed to update profile', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtnText.style.display = 'inline';
    saveBtnLoading.style.display = 'none';
  }
};

const handleAvatarChange = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  if (!file.type.startsWith('image/')) {
    API.showNotification('Please select an image file', 'error');
    return;
  }

  if (file.size > 5 * 1024 * 1024) {
    API.showNotification('File size must be less than 5MB', 'error');
    return;
  }

  try {
    const formData = new FormData();
    formData.append('avatar', file);

    const token = API.getToken();
    const response = await fetch(`${API.API_BASE_URL}/account/profile/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const result = await response.json();

    if (response.ok) {
      document.getElementById('avatarPreview').src = result.data.avatarUrl;
      document.getElementById('avatarPreview').style.display = 'block';
      document.getElementById('avatarPlaceholder').style.display = 'none';
      originalProfile.avatarUrl = result.data.avatarUrl;
      API.showNotification('Avatar updated successfully', 'success');
    } else {
      API.showNotification(result.message || 'Failed to update avatar', 'error');
    }
  } catch (error) {
    console.error('Error updating avatar:', error);
    API.showNotification('Failed to update avatar', 'error');
  }
};

const handleToggle = () => {
  const toggle = document.getElementById('twoFactorToggle');
  const dot = document.querySelector('.dot');
  const container = dot.parentElement;
  
  if (toggle.checked) {
    container.style.backgroundColor = 'var(--primary-green)';
    dot.style.transform = 'translateX(20px)';
  } else {
    container.style.backgroundColor = 'var(--border-subtle)';
    dot.style.transform = 'translateX(0)';
  }
};

document.addEventListener('DOMContentLoaded', () => {
  loadProfile();
  document.getElementById('accountForm').addEventListener('submit', handleSave);
  document.getElementById('changeAvatarBtn').addEventListener('click', () => {
    document.getElementById('avatarInput').click();
  });
  document.getElementById('avatarInput').addEventListener('change', handleAvatarChange);
  document.getElementById('twoFactorToggle').addEventListener('change', handleToggle);
});
