    const container = document.getElementById('cardFlipContainer');
    const front = document.getElementById('cardFront');
    const back = document.getElementById('cardBack');
    let currentModule = 'login';
    let cropper = null;

    // 同步卡片高度
    function syncCardHeight() {
      if (currentModule === 'register') {
        container.style.height = back.offsetHeight + 'px';
      } else {
        container.style.height = front.offsetHeight + 'px';
      }
    }

    // 页面初次加载时初始化高度
    window.addEventListener('DOMContentLoaded', syncCardHeight);
    window.addEventListener('load', syncCardHeight);
    window.addEventListener('resize', syncCardHeight);

    // 3D 翻转卡片切换模块
    function toggleModule(target) {
      currentModule = target;
      if (target === 'register') {
        container.style.height = back.offsetHeight + 'px';
        container.classList.add('flipped');
      } else {
        container.style.height = front.offsetHeight + 'px';
        container.classList.remove('flipped');
      }
    }

    // 注册表单校验
    function validateRegister(e) {
      const pwd = document.getElementById('regPassword').value;
      const confirmPwd = document.getElementById('regConfirmPassword').value;
      if (pwd !== confirmPwd) {
        e.preventDefault();
        alert('两次输入的密码不一致，请重新输入');
        return false;
      }
      return true;
    }

    // 切换密码显隐
    function togglePasswordVisibility(inputId, toggleBtn) {
      const input = document.getElementById(inputId);
      const icon = toggleBtn.querySelector('ion-icon');
      if (input.type === 'password') {
        input.type = 'text';
        icon.name = 'eye-outline';
      } else {
        input.type = 'password';
        icon.name = 'eye-off-outline';
      }
    }

    // 监听系统主题变化切换Logo
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');
    const logoImgs = document.querySelectorAll('.login-logo');
    function updateLogo(e) {
      const src = e.matches ? 'statics/images/darkicon.png' : 'statics/images/lighticon.png';
      const scale = e.matches ? 'scale(1.2)' : 'scale(1)';
      logoImgs.forEach(img => {
        img.src = src;
        img.style.transform = scale;
      });
    }
    prefersDark.addEventListener('change', updateLogo);
    updateLogo(prefersDark);
    
    // 打开图片裁剪弹窗
    function previewAvatar(event) {
      const file = event.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
          const imageToCrop = document.getElementById('imageToCrop');
          imageToCrop.src = e.target.result;
          
          const modal = document.getElementById('cropModal');
          modal.style.display = 'flex';
          
          if (cropper) {
            cropper.destroy();
          }
          
          cropper = new Cropper(imageToCrop, {
            aspectRatio: 1, // 1:1 正方形/圆角头像比例
            viewMode: 1,
            dragMode: 'move',
            autoCropArea: 0.85,
            restore: false,
            guides: true,
            center: true,
            highlight: false,
            cropBoxMovable: true,
            cropBoxResizable: true,
            toggleDragModeOnDblclick: false,
          });
        };
        reader.readAsDataURL(file);
      }
    }

    // 关闭裁剪弹窗
    function closeCropModal() {
      const modal = document.getElementById('cropModal');
      modal.style.display = 'none';
      if (cropper) {
        cropper.destroy();
        cropper = null;
      }
      document.getElementById('avatarInput').value = '';
    }

    // 确认裁剪
    function confirmCrop() {
      if (!cropper) return;
      const canvas = cropper.getCroppedCanvas({
        width: 256,
        height: 256,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high'
      });
      
      const croppedDataUrl = canvas.toDataURL('image/png');
      const img = document.getElementById('avatarImg');
      const icon = document.querySelector('.avatar-preview ion-icon');
      img.src = croppedDataUrl;
      img.style.display = 'block';
      icon.style.display = 'none';
      
      closeCropModal();
      setTimeout(syncCardHeight, 50);
    }
