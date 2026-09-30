const TMDB_API_KEY = '6c98030478d91f7761c94ee81abf6be4';

const userChoices = {
  maxTime: null,
  genreId: null,
  person: '',
  ottIds: [] 
};

let currentPage = 1;
let totalPages = 1;
let allFetchedMovies = [];
let renderedIndex = 0;
const BATCH_SIZE = 6;

document.addEventListener('DOMContentLoaded', () => {
  setupButtonToggle('#step1 .opt-btn', (val) => userChoices.maxTime = val, 'time');
  setupButtonToggle('#step2 .opt-btn', (val) => userChoices.genreId = val, 'genre');
  setupMultiButtonToggle('#step4 .opt-btn', 'ott');

  document.getElementById('search-btn').addEventListener('click', startNewSearch);
  document.getElementById('more-btn').addEventListener('click', loadMoreMovies);
  document.getElementById('modal-close').addEventListener('click', closeModal);
});

function setupButtonToggle(selector, callback, dataKey) {
  const buttons = document.querySelectorAll(selector);
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      const value = btn.dataset[dataKey];
      callback(value);
    });
  });
}

function setupMultiButtonToggle(selector, dataKey) {
  const buttons = document.querySelectorAll(selector);
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('selected'); 
      const value = btn.dataset[dataKey];
      
      if (btn.classList.contains('selected')) {
        if (!userChoices.ottIds.includes(value)) {
          userChoices.ottIds.push(value);
        }
      } else {
        userChoices.ottIds = userChoices.ottIds.filter(id => id !== value);
      }
    });
  });
}

async function startNewSearch() {
  currentPage = 1;
  totalPages = 1;
  allFetchedMovies = [];
  renderedIndex = 0;

  const resultsContainer = document.getElementById('results-grid');
  resultsContainer.innerHTML = '<p class="placeholder-text">조건에 알맞은 영상들을 분석하는 중...</p>';
  document.getElementById('more-btn').style.display = 'none';
  document.getElementById('step5').scrollIntoView({ behavior: 'smooth' });

  await fetchAndRenderMovies(true);
}

async function loadMoreMovies() {
  if (renderedIndex + BATCH_SIZE > allFetchedMovies.length && currentPage < totalPages) {
    currentPage++;
    await fetchAndRenderMovies(false);
  } else {
    renderBatch();
  }
}

async function fetchAndRenderMovies(isInitial = true) {
  try {
    let url = `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_API_KEY}&language=ko-KR&sort_by=popularity.desc&watch_region=KR&page=${currentPage}`;

    if (userChoices.genreId) url += `&with_genres=${userChoices.genreId}`;
    if (userChoices.maxTime && userChoices.maxTime !== '999') url += `&with_runtime.lte=${userChoices.maxTime}`;
    
    if (userChoices.ottIds.length > 0) {
      const ottQuery = userChoices.ottIds.join('|');
      url += `&with_watch_providers=${ottQuery}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    totalPages = data.total_pages || 1;

    if (isInitial && (!data.results || data.results.length === 0)) {
      document.getElementById('results-grid').innerHTML = '<p class="placeholder-text">조건에 딱 맞는 영화가 없습니다. 다른 조건으로 시도해보세요!</p>';
      document.getElementById('more-btn').style.display = 'none';
      return;
    }

    if (isInitial) {
      document.getElementById('results-grid').innerHTML = '';
    }

    allFetchedMovies = [...allFetchedMovies, ...data.results];
    renderBatch();

  } catch (error) {
    console.error('API Error:', error);
    if (isInitial) {
      document.getElementById('results-grid').innerHTML = '<p class="placeholder-text">영상을 가져오는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>';
    }
  }
}

function renderBatch() {
  const resultsContainer = document.getElementById('results-grid');
  const batch = allFetchedMovies.slice(renderedIndex, renderedIndex + BATCH_SIZE);

  batch.forEach((movie) => {
    const posterPath = movie.poster_path 
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` 
      : 'https://via.placeholder.com/500x750?text=No+Image';

    const matchRate = Math.max(60, 98 - (renderedIndex * 2));

    const card = document.createElement('div');
    card.className = 'movie-card';
    card.innerHTML = `
      <img src="${posterPath}" alt="${movie.title}">
      <div class="movie-info">
        <h3>${movie.title}</h3>
        <p>⭐ ${movie.vote_average.toFixed(1)} / 10</p>
        <span class="match-badge">FYP 일치도 ${matchRate}%</span>
      </div>
    `;

    card.addEventListener('click', () => openModal(movie, matchRate, posterPath));
    resultsContainer.appendChild(card);
    renderedIndex++;
  });

  const moreBtn = document.getElementById('more-btn');
  if (renderedIndex < allFetchedMovies.length || currentPage < totalPages) {
    moreBtn.style.display = 'block';
  } else {
    moreBtn.style.display = 'none';
  }
}

// ✨ 다중 리뷰 및 원본 텍스트 지원 모달 함수
async function openModal(movie, matchRate, posterPath) {
  document.getElementById('modal-img').src = posterPath;
  document.getElementById('modal-title').innerText = movie.title;
  document.getElementById('modal-meta').innerText = `⭐ ${movie.vote_average.toFixed(1)}점 | 📅 ${movie.release_date || '개봉일 미정'} | 🎯 일치도 ${matchRate}%`;
  document.getElementById('modal-overview').innerText = movie.overview || '상세 줄거리 정보가 제공되지 않는 영화입니다.';

const watchSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(movie.title + ' 보러가기 OTT')}`;
  const trailerSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(movie.title + ' 예고편')}`;

  document.getElementById('btn-watch-link').href = watchSearchUrl;
  document.getElementById('btn-trailer-link').href = trailerSearchUrl;

  document.getElementById('movie-modal').style.display = 'flex';

  // 리뷰 리스트 요소 가져오기
  const reviewContainer = document.getElementById('modal-review-list');
  reviewContainer.innerHTML = '<p style="color:#ddd;">글로벌 유저 리뷰를 분석하는 중... ⏳</p>';

  try {
    const reviewRes = await fetch(`https://api.themoviedb.org/3/movie/${movie.id}/reviews?api_key=${TMDB_API_KEY}`);
    const reviewData = await reviewRes.json();

    if (reviewData.results && reviewData.results.length > 0) {
      let reviewsHTML = '';
      
      // 최대 3개의 리뷰 가져오기
      const maxReviews = Math.min(3, reviewData.results.length);
      
      for(let i=0; i<maxReviews; i++) {
        const review = reviewData.results[i];
        
        // 글자수 자르기 없앰 (원본 그대로 출력)
        reviewsHTML += `
          <div class="review-item">
            <span class="review-author">@${review.author}</span>
            <div class="review-content">"${review.content}"</div>
          </div>
        `;
      }
      
      reviewContainer.innerHTML = reviewsHTML;
    } else {
      reviewContainer.innerHTML = '<p style="color:#ddd;">아직 이 영상에 등록된 글로벌 리뷰가 없습니다. 🥲</p>';
    }
  } catch (error) {
    reviewContainer.innerHTML = '<p style="color:#ddd;">리뷰 정보를 불러오는 데 실패했습니다.</p>';
  }
}

function closeModal() {
  document.getElementById('movie-modal').style.display = 'none';
}