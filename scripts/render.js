/**
 * ============================================================
 * RENDER - All HTML Building Functions
 * ============================================================
 */

/**
 * Build a news card
 */
function buildCard(a, e, size) {
  const c = document.createElement('a');
  c.className = 'card ' + (size || '') + (a.isOwn ? ' own-article' : '');

  if (a.isOwn) {
    c.href = '#';
    (function(article) {
      c.onclick = function(ev) {
        ev.preventDefault();
        openArtModal(article);
      };
    })(a);
  } else if (a.isVideo && a.videoId) {
    c.href = '#';
    c.onclick = function(ev) {
      ev.preventDefault();
      openYT(a.videoId);
    };
  } else {
    c.href = a.link;
    c.onclick = function(ev) {
      ev.preventDefault();
      const isDesktop = window.innerWidth > 1024;
      const w = isDesktop ? 900 : Math.round(screen.width * 0.90);
      const h = isDesktop ? 650 : Math.round(screen.height * 0.90);
      const left = Math.round((screen.width - w) / 2);
      const top = Math.round((screen.height - h) / 2);
      window.open(
        a.link,
        '_blank',
        'width=' + w + ',height=' + h + ',left=' + left + ',top=' + top + ',toolbar=0,menubar=0,scrollbars=1,resizable=1,status=0'
      );
    };
  }

  const img = a.image
    ? '<img class="card-img" src="' + a.image + '" loading="lazy" onerror="this.outerHTML=\'<div class=card-img-placeholder>' + e + '</div>\'">'
    : '<div class="card-img-placeholder">' + e + '</div>';

  let d = cleanText(a.description || '');
  if (!d || d.trim().length < 5) {
    d = 'Experience full depth and insight beyond the preview. Click to reach the complete article and stay ahead of the game.';
  }

  const badge = a.isVideo
    ? '<span class="read-more-badge">WATCH</span>'
    : '<span class="read-more-badge">READ MORE</span>';

  const sourceText = a.isOwn ? 'Net Sessions' : (a.source || '');
  const sourceTag = sourceText ? '<span class="card-source">' + sourceText + '</span>' : '';

  const playOverlay = a.isVideo
    ? '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:56px;height:56px;background:rgba(255,0,0,0.85);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;pointer-events:none;">▶</div>'
    : '';
  const imgWrap = a.isVideo ? '<div style="position:relative;line-height:0;">' + img + playOverlay + '</div>' : img;

  let authorRow = '';
  if (a.isOwn) {
    const auName = (a.authorName && a.authorName.trim()) ? a.authorName : 'SPORTSrip Team';
    const auPhoto = a.authorPhoto || '';
    const auInit = auName.split(' ').map(function(w) { return w[0] || ''; }).join('').toUpperCase().slice(0, 2) || 'SR';
    const avHtml = auPhoto
      ? '<img class="card-av" src="' + auPhoto + '">'
      : '<div class="card-av-ph">' + auInit + '</div>';

    const shareText = encodeURIComponent(a.title + ' - SPORTSrip');
    const shareUrl = encodeURIComponent('https://www.sportsrip.com');

    authorRow = '<div class="card-author-row">' +
      '<div class="card-author-left">' + avHtml + '<span class="card-author-name">' + auName + '</span></div>' +
      '<div class="card-share-btns">' +
        '<a class="card-share-btn" title="WhatsApp" href="https://wa.me/?text=' + shareText + '%20' + shareUrl + '" target="_blank" onclick="event.stopPropagation()">💬</a>' +
        '<a class="card-share-btn" title="Share on X" href="https://x.com/intent/tweet?text=' + shareText + '&url=' + shareUrl + '" target="_blank" onclick="event.stopPropagation()">𝕏</a>' +
        '<span class="card-share-btn" title="Copy link" onclick="event.stopPropagation();navigator.clipboard.writeText(window.location.origin);this.textContent=String.fromCharCode(10003);var t=this;setTimeout(function(){t.textContent=String.fromCharCode(128279);},1500);">' + String.fromCharCode(128279) + '</span>' +
      '</div>' +
    '</div>';
  }

  c.innerHTML =
    imgWrap +
    '<div class="card-body">' +
      '<div class="card-meta">' + badge + sourceTag + '</div>' +
      '<div class="card-title">' + a.title + '</div>' +
      '<div class="card-desc">' + d + '</div>' +
      authorRow +
    '</div>';

  return c;
}

/**
 * Build a sidebar item
 */
function buildSidebarItem(a, e) {
  const el = document.createElement('a');
  el.className = 'sidebar-article';

  if (a.isOwn) {
    el.href = '#';
    el.onclick = (function(art) {
      return function(ev) {
        ev.preventDefault();
        if (window.innerWidth > 768) openArtModal(art);
        else window.location.href = 'blog.html?data=' + encodeURIComponent(JSON.stringify(art));
      };
    })(a);
  } else {
    el.href = a.link;
    el.onclick = function(ev) {
      ev.preventDefault();
      const w = 900;
      const h = 650;
      const left = Math.round((screen.width - w) / 2);
      const top = Math.round((screen.height - h) / 2);
      window.open(a.link, '_blank', 'width=' + w + ',height=' + h + ',left=' + left + ',top=' + top + ',toolbar=0,menubar=0,scrollbars=1,resizable=1,status=0');
    };
  }

  const thumb = a.image
    ? '<img class="sidebar-thumb" src="' + a.image + '" onerror="this.outerHTML=\'<div class=sidebar-thumb-placeholder>' + e + '</div>\'">'
    : '<div class="sidebar-thumb-placeholder">' + e + '</div>';

  el.innerHTML = thumb + '<div class="sidebar-text"><div class="sidebar-headline">' + a.title + '</div><div class="sidebar-source">' + (a.isOwn ? 'Net Sessions' : (a.source || 'SPORTSrip')) + '</div></div>';
  return el;
}

function getTabMeta(tabKey) {
  return CATEGORY_META[tabKey] || {
    label: tabKey,
    emoji: SPECIAL_TAB_EMOJI[tabKey] || DEFAULT_TAB_EMOJI
  };
}

function buildEditorialTile(article, sizeClass) {
  const emoji = getTabMeta(article.sport).emoji;
  const wrapper = document.createElement('article');
  wrapper.className = 'editorial-tile ' + (sizeClass || '');
  const title = article.title || 'Untitled';
  const desc = cleanText(article.description || '').slice(0, 150) || 'Open the full story for more context and detail.';
  const source = article.isOwn ? 'Net Sessions' : (article.source || getTabMeta(article.sport).label);
  const img = article.image
    ? '<img src="' + article.image + '" alt="' + title.replace(/"/g, '&quot;') + '" loading="lazy">'
    : '<div class="editorial-thumb-fallback">' + emoji + '</div>';

  wrapper.innerHTML =
    '<a class="editorial-link" href="' + (article.link || '#') + '">' +
      '<div class="editorial-thumb">' + img + '</div>' +
      '<div class="editorial-copy">' +
        '<div class="editorial-kicker">' + source + '</div>' +
        '<h3>' + title + '</h3>' +
        '<p>' + desc + '</p>' +
      '</div>' +
    '</a>';

  const link = wrapper.querySelector('.editorial-link');
  if (article.isOwn) {
    link.href = '#';
    link.onclick = function(ev) {
      ev.preventDefault();
      openArtModal(article);
    };
  } else if (article.isVideo && article.videoId) {
    link.href = '#';
    link.onclick = function(ev) {
      ev.preventDefault();
      openYT(article.videoId);
    };
  } else {
    link.onclick = function(ev) {
      ev.preventDefault();
      window.open(article.link, '_blank', 'width=1100,height=760,toolbar=0,menubar=0,scrollbars=1,resizable=1,status=0');
    };
  }

  return wrapper;
}

function buildEditorialListItem(article, index) {
  const item = document.createElement('div');
  item.className = 'editorial-rank-item';
  const source = article.isOwn ? 'Net Sessions' : (article.source || getTabMeta(article.sport).label);
  item.innerHTML =
    '<div class="editorial-rank-no">' + String(index + 1).padStart(2, '0') + '</div>' +
    '<div class="editorial-rank-copy">' +
      '<div class="editorial-rank-source">' + source + '</div>' +
      '<div class="editorial-rank-title">' + article.title + '</div>' +
    '</div>';

  item.onclick = function() {
    if (article.isOwn) {
      openArtModal(article);
    } else if (article.isVideo && article.videoId) {
      openYT(article.videoId);
    } else {
      window.open(article.link, '_blank', 'width=1000,height=720,toolbar=0,menubar=0,scrollbars=1,resizable=1,status=0');
    }
  };

  return item;
}

function renderEditorialNews(articles) {
  const output = document.getElementById('output');
  output.innerHTML = '';

  if (!articles.length) {
    output.innerHTML = '<div class="editorial-empty">No stories available in this section yet.</div>';
    return;
  }

  const feature = articles[0];
  const analysis = articles.slice(1, 3);
  const trending = articles.slice(3, 7);
  const videoHighlights = articles.filter(function(article) {
    return article.isVideo;
  }).slice(0, 2);
  const moreStories = articles.slice(7, 13);

  const shell = document.createElement('div');
  shell.className = 'editorial-shell';

  const livebar = document.createElement('section');
  livebar.className = 'editorial-livebar';
  livebar.innerHTML =
    '<span class="editorial-live-pill">Live</span>' +
    '<div class="editorial-live-copy">' + (feature.title || ('Latest ' + getTabMeta(currentSport).label + ' updates')) + '</div>';
  shell.appendChild(livebar);

  const heroGrid = document.createElement('section');
  heroGrid.className = 'editorial-hero-grid';

  const hero = document.createElement('div');
  hero.className = 'editorial-hero';
  const heroImage = feature.image
    ? '<img src="' + feature.image + '" alt="' + feature.title.replace(/"/g, '&quot;') + '" loading="lazy">'
    : '<div class="editorial-thumb-fallback editorial-hero-fallback">' + getTabMeta(feature.sport).emoji + '</div>';
  hero.innerHTML =
    '<a class="editorial-hero-link" href="' + (feature.link || '#') + '">' +
      '<div class="editorial-hero-media">' + heroImage + '</div>' +
      '<div class="editorial-hero-overlay">' +
        '<div class="editorial-kicker">' + (feature.isOwn ? 'Net Sessions' : (feature.source || getTabMeta(feature.sport).label)) + '</div>' +
        '<h1>' + feature.title + '</h1>' +
        '<p>' + (cleanText(feature.description || '').slice(0, 170) || 'A featured lead story powered by the SPORTSrip pipeline.') + '</p>' +
      '</div>' +
    '</a>';

  const heroLink = hero.querySelector('.editorial-hero-link');
  if (feature.isOwn) {
    heroLink.href = '#';
    heroLink.onclick = function(ev) {
      ev.preventDefault();
      openArtModal(feature);
    };
  } else if (feature.isVideo && feature.videoId) {
    heroLink.href = '#';
    heroLink.onclick = function(ev) {
      ev.preventDefault();
      openYT(feature.videoId);
    };
  } else {
    heroLink.onclick = function(ev) {
      ev.preventDefault();
      window.open(feature.link, '_blank', 'width=1100,height=760,toolbar=0,menubar=0,scrollbars=1,resizable=1,status=0');
    };
  }

  const sideRail = document.createElement('aside');
  sideRail.className = 'editorial-side-rail';
  sideRail.innerHTML =
    '<div class="editorial-side-title">Trending Now</div>' +
    '<div id="editorialTrendingList"></div>';

  trending.forEach(function(article, index) {
    sideRail.querySelector('#editorialTrendingList').appendChild(buildEditorialListItem(article, index));
  });

  heroGrid.appendChild(hero);
  heroGrid.appendChild(sideRail);
  shell.appendChild(heroGrid);

  const analysisSection = document.createElement('section');
  analysisSection.className = 'editorial-block';
  analysisSection.innerHTML =
    '<div class="editorial-section-head">' +
      '<h2>Latest Analysis</h2>' +
      '<span>View All</span>' +
    '</div>' +
    '<div class="editorial-card-grid" id="editorialAnalysis"></div>';
  analysis.forEach(function(article) {
    analysisSection.querySelector('#editorialAnalysis').appendChild(buildEditorialTile(article, 'editorial-analysis-tile'));
  });
  shell.appendChild(analysisSection);

  if (videoHighlights.length) {
    const videoSection = document.createElement('section');
    videoSection.className = 'editorial-block';
    videoSection.innerHTML =
      '<div class="editorial-section-head">' +
        '<h2>Video Highlights</h2>' +
        '<span>Studio</span>' +
      '</div>' +
      '<div class="editorial-card-grid" id="editorialVideos"></div>';
    videoHighlights.forEach(function(article) {
      videoSection.querySelector('#editorialVideos').appendChild(buildEditorialTile(article, 'editorial-video-tile'));
    });
    shell.appendChild(videoSection);
  }

  const lowerGrid = document.createElement('section');
  lowerGrid.className = 'editorial-block editorial-more-section';
  lowerGrid.innerHTML =
    '<div class="editorial-section-head"><h2>More Stories</h2><span>Desk file</span></div>' +
    '<div class="editorial-card-grid" id="editorialMoreStories"></div>';
  moreStories.forEach(function(article) {
    lowerGrid.querySelector('#editorialMoreStories').appendChild(buildEditorialTile(article, 'editorial-story-tile'));
  });
  shell.appendChild(lowerGrid);

  output.appendChild(shell);
}

/**
 * Render news articles
 */
async function renderNews() {
  const o = document.getElementById('output');
  o.innerHTML = 'Connecting to feeds...';

  let a = currentSport === 'main' ? allCache : (sportCache[currentSport] || []);

  if (!a.length) {
    o.innerHTML = '<div style="grid-column:1/-1; padding:60px; text-align:center;">No stories found.</div>';
    return;
  }

  if (THEME === 'editorial') {
    renderEditorialNews(a);
    return;
  }

  o.innerHTML = '';
  const f = document.createDocumentFragment();

  let interleaved = [];

  if (currentSport === 'net-sessions') {
    interleaved = a;
  } else {
    const ownArts = a.filter(function(x) { return x.isOwn; });
    const rssArts = a.filter(function(x) { return !x.isOwn; });

    let oi = 0;
    let ri = 0;
    while (ri < rssArts.length || oi < ownArts.length) {
      if (interleaved.length === 0 && oi < ownArts.length) {
        interleaved.push(ownArts[oi++]);
      } else if (ri < rssArts.length) {
        interleaved.push(rssArts[ri++]);
        if (ri < rssArts.length) interleaved.push(rssArts[ri++]);
        if (oi < ownArts.length) interleaved.push(ownArts[oi++]);
      } else if (oi < ownArts.length) {
        interleaved.push(ownArts[oi++]);
      }
    }
  }

  window._mainFeedTitles = new Set(interleaved.map(function(x) { return x.title; }));

  interleaved.forEach(function(x, index) {
    const s = (index === 0 && x.image && window.innerWidth > 1000) ? 'card-hero' : '';
    f.appendChild(buildCard(x, getTabMeta(x.sport).emoji, s));
  });

  o.appendChild(f);
}

/**
 * Generate navigation tabs
 */
function generateTabs(list) {
  const activeTabs = ['main'].concat((list || []).filter(function(tabKey) {
    return tabKey && tabKey !== 'main';
  }));

  let desktopH = '';
  let mobileH = '';

  activeTabs.forEach(function(s) {
    const activeClass = s === currentSport ? ' active' : '';
    const label = getTabMeta(s).label || s.toUpperCase();
    desktopH += '<div class="tab' + activeClass + '" data-sport="' + s + '" onclick="setActive(\'' + s + '\')">' + label + '</div>';
    mobileH += '<div class="mobile-tab' + activeClass + '" data-sport="' + s + '" onclick="setActive(\'' + s + '\'); toggleMenu();">' + label + '</div>';
  });

  document.getElementById('desktopTabs').innerHTML = desktopH;
  document.getElementById('mobileMenu').innerHTML = mobileH;
}
