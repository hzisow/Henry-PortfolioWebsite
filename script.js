const projectsData = {
  'brusher-games': {
    title: 'Brusher Games',
    description: 'A web-based platform that organizes, manages, and tracks school-wide elimination-style games by assigning targets, recording eliminations, and displaying live standings.',
    tags: ['Replit', 'AI', 'Vibecoding'],
    image: 'images/project-brusher.png',
    link: 'https://brushergames.replit.app',
    imageContain: false
  },
  'ai-tiktok': {
    title: 'AI Tiktok Video Automation',
    description: 'A fully automated AI TikTok video generator and uploader. Uses N8N, UploadPost API, Openrouter API, and Airtable.',
    tags: ['N8N', 'Openrouter', 'Automation'],
    image: 'images/project-tiktok.png',
    imageContain: true,
    downloadFile: 'Airtable_to_Platforms.json',
    downloadLabel: 'Download N8N Workflow'
  },
  'sora-downloader': {
    title: 'OpenAI Sora Video Bulk Downloader',
    description: 'An easy way to manage and organize SORA AI video downloads for increased organization throughout downloading. Works by taking in all the files Sora generates, then allows you to bulk download with the file name being the prompt name, allowing for easy organization.',
    tags: ['Sora', 'OpenAI', 'Replit'],
    image: 'images/project-sora.png',
    link: 'https://sora-batch-gen--hzisow.replit.app/',
    imageContain: false
  }
};

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) {
    el.scrollIntoView({ behavior: 'smooth' });
  }
  closeMobileMenu();
}

let mobileMenuOpen = false;

function toggleMobileMenu() {
  mobileMenuOpen = !mobileMenuOpen;
  const overlay = document.getElementById('mobile-overlay');
  const hamburger = document.getElementById('hamburger-icon');
  const closeIcon = document.getElementById('close-icon');

  if (mobileMenuOpen) {
    overlay.classList.add('visible');
    requestAnimationFrame(() => {
      overlay.classList.add('open');
    });
    hamburger.style.display = 'none';
    closeIcon.style.display = 'block';
    document.body.classList.add('no-scroll');
  } else {
    closeMobileMenu();
  }
}

function closeMobileMenu() {
  mobileMenuOpen = false;
  const overlay = document.getElementById('mobile-overlay');
  const hamburger = document.getElementById('hamburger-icon');
  const closeIcon = document.getElementById('close-icon');

  overlay.classList.remove('open');
  setTimeout(() => {
    overlay.classList.remove('visible');
  }, 200);
  hamburger.style.display = 'block';
  closeIcon.style.display = 'none';
  document.body.classList.remove('no-scroll');
}

function openModal(projectId) {
  const project = projectsData[projectId];
  if (!project) return;

  const overlay = document.getElementById('modal-overlay');
  const imageSection = document.getElementById('modal-image-section');
  const image = document.getElementById('modal-image');
  const gradient = document.getElementById('modal-image-gradient');
  const title = document.getElementById('modal-title');
  const tags = document.getElementById('modal-tags');
  const desc = document.getElementById('modal-description');
  const actions = document.getElementById('modal-actions');

  title.textContent = project.title;
  desc.textContent = project.description;

  image.style.backgroundImage = "url('" + project.image + "')";

  if (project.imageContain) {
    imageSection.classList.add('contain-mode');
    gradient.className = 'modal-image-gradient';
  } else {
    imageSection.classList.remove('contain-mode');
    gradient.className = 'modal-image-gradient cover-mode';
  }

  tags.innerHTML = project.tags.map(function(tag) {
    return '<span class="tag">' + tag + '</span>';
  }).join('');

  var actionsHtml = '';
  if (project.link) {
    actionsHtml += '<a href="' + project.link + '" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-glow">Visit Website <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg></a>';
  }
  if (project.downloadFile) {
    actionsHtml += '<a href="' + project.downloadFile + '" download class="btn btn-outline"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg> ' + (project.downloadLabel || 'Download File') + '</a>';
  }
  actions.innerHTML = actionsHtml;

  overlay.classList.add('open');
  document.body.classList.add('no-scroll');
}

function closeModal(event, force) {
  if (force || event.target === document.getElementById('modal-overlay')) {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('open');
    document.body.classList.remove('no-scroll');
  }
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    const overlay = document.getElementById('modal-overlay');
    if (overlay.classList.contains('open')) {
      overlay.classList.remove('open');
      document.body.classList.remove('no-scroll');
    }
    if (mobileMenuOpen) {
      closeMobileMenu();
    }
  }
});

const sectionIds = ['home', 'projects', 'resume', 'contact'];

const sectionObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      const id = entry.target.id;

      document.querySelectorAll('.nav-link').forEach(function(link) {
        if (link.dataset.section === id) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });

      document.querySelectorAll('.mobile-nav-link').forEach(function(link, index) {
        if (sectionIds[index] === id) {
          link.classList.add('active');
        } else {
          link.classList.remove('active');
        }
      });
    }
  });
}, { threshold: 0.3 });

sectionIds.forEach(function(id) {
  var el = document.getElementById(id);
  if (el) sectionObserver.observe(el);
});

const fadeObserver = new IntersectionObserver(function(entries) {
  entries.forEach(function(entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

document.querySelectorAll('.fade-in').forEach(function(el) {
  fadeObserver.observe(el);
});

window.addEventListener('resize', function() {
  if (window.innerWidth >= 768 && mobileMenuOpen) {
    closeMobileMenu();
  }
});
