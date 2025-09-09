import { useState, useEffect } from 'react';
import Search from './components/Search';
import Spinner from './components/Spinner';
import MovieCard from './components/MovieCard';
import { useDebounce } from 'react-use';  
import {getTrendingMovies, updateSearchCount, updateClickCount, updatePosterUrl} from './appwrite.js'; // trending now based on click collection


const API_BASE_URL = 'https://api.themoviedb.org/3';
const RAW_API_KEY = import.meta.env.VITE_TMDB_API_KEY;

// Detect if the provided key is a TMDB v4 (JWT) token or a v3 simple key.
// v4 tokens are long JWT strings containing at least two '.' characters.
const isV4Token = typeof RAW_API_KEY === 'string' && RAW_API_KEY.split('.').length >= 3;

// Build headers conditionally (only attach Authorization for v4 tokens)
const buildHeaders = () => {
  const headers = { accept: 'application/json' };
  if (isV4Token) {
    headers.Authorization = `Bearer ${RAW_API_KEY}`;
  }
  return headers;
};

// Helper to build endpoint with proper auth style
const buildEndpoint = (pathWithQuery) => {
  if (isV4Token) return `${API_BASE_URL}${pathWithQuery}`; // bearer header handles auth
  const sep = pathWithQuery.includes('?') ? '&' : '?';
  return `${API_BASE_URL}${pathWithQuery}${RAW_API_KEY ? `${sep}api_key=${RAW_API_KEY}` : ''}`;
};

const App = () => {
  const [searchTerm, setsearchTerm] = useState('')
  const [errorMessage, seterrorMessage] = useState('')
  const [trendingMovies, settrendingMovies] = useState([])
  const [movieList, setMovieList] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const [debouncedSearch, setdebouncedSearch] = useState('')
  const [selectedMovieId, setSelectedMovieId] = useState(null)
  const [movieDetails, setMovieDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState('')
  const [detailsCache, setDetailsCache] = useState({}) // id -> details

  useDebounce(() =>
    setdebouncedSearch(searchTerm), 500, [searchTerm]
  )
  

  const fetchMovies = async (query) => {
    setIsLoading(true);
    seterrorMessage('');
    try {
      if(!RAW_API_KEY){
        throw new Error('Missing TMDB API key. Set VITE_TMDB_API_KEY in your .env');
      }
      const endpoint = query
        ? buildEndpoint(`/search/movie?query=${encodeURIComponent(query)}`)
        : buildEndpoint('/discover/movie?sort_by=popularity.desc');

      const response = await fetch(endpoint, { method: 'GET', headers: buildHeaders() });
      if(response.status === 401){
        throw new Error('Unauthorized (401). Check if your TMDB key/token is valid and matches auth style (v3 vs v4).');
      }
      if(!response.ok){
        const text = await response.text();
        throw new Error(`Failed to fetch movies (${response.status}). ${text}`);
      }

      const data = await response.json();
      if(data.response=='false'){
        seterrorMessage(data.error || 'Failed to fetch movies');
        setMovieList([]);
        return;
      }
      setMovieList(data.results || []);

      if(query && data.results.length > 0){
        await updateSearchCount(query, data.results[0]);
      }
    } catch (error) {
  console.error(`Error fetching movies: ${error}`);
  seterrorMessage(error.message || 'Error fetching movies');
    } finally {
      setIsLoading(false);
    }
  }

  const loadTrendingMovies = async () => {
    try {
      const movies = await getTrendingMovies();
      settrendingMovies(movies);
    } catch(error){
      console.error(`Error loading trending movies: ${error}`);
    }
  }

  const fetchMovieDetails = async (id) => {
    setDetailsError('');
    if(!id) return;
    if(detailsCache[id]){ // use cached details
      setMovieDetails(detailsCache[id]);
      return;
    }
    try {
      setDetailsLoading(true);
      const endpoint = buildEndpoint(`/movie/${id}?append_to_response=credits,videos`);
      const res = await fetch(endpoint, { headers: buildHeaders() });
      if(!res.ok){
        throw new Error(`Failed to fetch movie details (${res.status})`);
      }
      const data = await res.json();
      setMovieDetails(data);
      setDetailsCache(prev => ({...prev, [id]: data}));
      if(data.poster_path){
        const fullPoster = `https://image.tmdb.org/t/p/w500/${data.poster_path}`;
        updatePosterUrl(data.id, fullPoster).then(()=> loadTrendingMovies());
      }
    } catch (err){
      console.error(err);
      setDetailsError(err.message || 'Failed to load details');
    } finally {
      setDetailsLoading(false);
    }
  }

  const openMovieModal = async (movie) => {
    if(!movie?.id) return;
    setSelectedMovieId(movie.id);
    setMovieDetails(null);
    fetchMovieDetails(movie.id);
    // increment click count & refresh trending asynchronously
    updateClickCount(movie).then(() => {
      loadTrendingMovies();
    });
  }

  const closeModal = () => {
    setSelectedMovieId(null);
    setMovieDetails(null);
    setDetailsError('');
  }

  useEffect(() => {
    const handleEsc = (e) => {
      if(e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);
  useEffect(() => {
    fetchMovies(debouncedSearch);
  }, [debouncedSearch]);

  useEffect(() => {
    loadTrendingMovies();
  }, []);
  return (
    <main>

      <div className='pattern' />

      <div className='wrapper'>
        <header>
          <img src='./hero.png' alt='Hero Banner' />
          <h1>Find <span className='text-gradient'>Movies</span> You'll Enjoy Without the Hassle</h1>
          <Search searchTerm={searchTerm} setsearchTerm={setsearchTerm} />
        </header>

        {trendingMovies.length > 0 && (
          <section className='trending'>
            <h2>Trending Movies</h2>
            <ul>
              {trendingMovies.map((movie, index) => (
                <li key={movie.$id}>
                  <p>{index +1}</p>
                  <img src={movie.poster_url} alt={movie.title}/>
                </li>
              ))}
            </ul>
          </section>
          )}
        <section className='all-movies'>
          <h2>All Movies</h2>
          
          {isLoading ? (
            <Spinner />
          ) : errorMessage ? (
            <p className='text-red-500'>{errorMessage}</p>
          ) : (
            <ul>
              {movieList.map((movie) => (
                <MovieCard key={movie.id} movie={movie} onClick={() => openMovieModal(movie)} />
              ))}
            </ul>
          )}   
        </section>

        {selectedMovieId && (
          <div className='fixed inset-0 z-50 flex items-center sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 xs:p-2 sm:p-6 overflow-y-auto'
               style={{paddingTop:'12vh'}}
               onClick={(e) => { if(e.target === e.currentTarget) closeModal(); }} role='dialog' aria-modal='true' aria-labelledby='movie-dialog-title'>
            <div className='relative w-full max-w-4xl bg-dark-100 rounded-none xs:rounded-2xl shadow-2xl border border-light-100/10 text-left animate-fade-in focus:outline-none max-h-[90vh] flex flex-col'>
              <button onClick={closeModal} className='absolute top-3 right-3 text-gray-100 hover:text-white text-xl font-bold'>×</button>
              {detailsLoading && (
                <div className='p-14 flex justify-center flex-1'><Spinner /></div>
              )}
              {!detailsLoading && detailsError && (
                <div className='p-6'>
                  <p className='text-red-400 text-sm'>{detailsError}</p>
                </div>
              )}
              {!detailsLoading && movieDetails && (
                <div className='flex-1 overflow-y-auto hide-scrollbar'>
                  <div className='flex flex-col md:grid md:grid-cols-3 gap-6 p-4 sm:p-8'>
                    <div className='md:col-span-1'>
                      <img className='rounded-none xs:rounded-xl w-full h-full max-h-[380px] object-cover shadow-md' src={movieDetails.poster_path ? `https://image.tmdb.org/t/p/w500/${movieDetails.poster_path}` : './no-movie.png'} alt={movieDetails.title} />
                    </div>
                    <div className='md:col-span-2 flex flex-col gap-5'>
                      <div>
                        <h3 id='movie-dialog-title' className='text-2xl sm:text-3xl font-bold text-white mb-1'>{movieDetails.title}</h3>
                        {movieDetails.tagline && <p className='text-sm italic text-gray-100'>{movieDetails.tagline}</p>}
                      </div>
                      <p className='text-gray-100 text-sm leading-relaxed whitespace-pre-line'>{movieDetails.overview || 'No synopsis available.'}</p>
                      <div className='flex flex-wrap gap-2'>
                        {movieDetails.genres?.map(g => (
                          <span key={g.id} className='px-2 py-1 rounded-full bg-light-100/10 text-[11px] tracking-wide text-light-100'>{g.name}</span>
                        ))}
                      </div>
                      <div className='grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs sm:text-sm text-gray-100'>
                        <div><p className='uppercase tracking-wide text-gray-100/60'>Release</p><p>{movieDetails.release_date || '—'}</p></div>
                        <div><p className='uppercase tracking-wide text-gray-100/60'>Runtime</p><p>{movieDetails.runtime ? movieDetails.runtime + ' min' : '—'}</p></div>
                        <div><p className='uppercase tracking-wide text-gray-100/60'>Rating</p><p>{movieDetails.vote_average ? movieDetails.vote_average.toFixed(1) : 'N/A'}</p></div>
                        <div><p className='uppercase tracking-wide text-gray-100/60'>Votes</p><p>{movieDetails.vote_count || 0}</p></div>
                        <div><p className='uppercase tracking-wide text-gray-100/60'>Language</p><p className='uppercase'>{movieDetails.original_language}</p></div>
                        <div><p className='uppercase tracking-wide text-gray-100/60'>Status</p><p>{movieDetails.status || '—'}</p></div>
                      </div>
                      {movieDetails.credits?.cast?.length > 0 && (
                        <div>
                          <p className='text-xs uppercase tracking-wide text-gray-100/70 mb-2'>Top Cast</p>
                          <ul className='flex gap-4 overflow-x-auto hide-scrollbar pr-2 pb-2'>
                            {movieDetails.credits.cast.slice(0,12).map(actor => (
                              <li key={actor.cast_id} className='min-w-[70px] text-center'>
                                <div className='w-14 h-14 mx-auto mb-1 rounded-full overflow-hidden bg-light-100/10'>
                                  {actor.profile_path ? (
                                    <img className='w-full h-full object-cover' src={`https://image.tmdb.org/t/p/w185/${actor.profile_path}`} alt={actor.name} />
                                  ) : (
                                    <div className='flex items-center justify-center w-full h-full text-[9px] text-gray-100'>No Img</div>
                                  )}
                                </div>
                                <p className='text-[10px] text-white font-medium line-clamp-2'>{actor.name}</p>
                                <p className='text-[9px] text-gray-100 line-clamp-1'>{actor.character}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {movieDetails.videos?.results?.length > 0 && (
                        <div>
                          <p className='text-xs uppercase tracking-wide text-gray-100/70 mb-2'>Videos</p>
                          <div className='flex gap-3 flex-wrap'>
                            {movieDetails.videos.results.filter(v => v.site === 'YouTube').slice(0,3).map(v => (
                              <a key={v.id} href={`https://www.youtube.com/watch?v=${v.key}`} target='_blank' rel='noreferrer' className='text-indigo-400 hover:underline text-xs'>▶ {v.type}</a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </main>
  )
}

export default App