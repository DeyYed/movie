import { Client, Databases, ID, Query } from 'appwrite';

const DATABASE_ID = import.meta.env.VITE_APPWRITE_DATABASE_ID;
// Main collection for search term metrics
const COLLECTION_ID = import.meta.env.VITE_APPWRITE_COLLECTION_ID;
// Separate collection for click metrics (OPTION B). Falls back to main collection if not provided.
const CLICKS_COLLECTION_ID = import.meta.env.VITE_APPWRITE_CLICKS_COLLECTION_ID || COLLECTION_ID;
const PROJECT_ID = import.meta.env.VITE_APPWRITE_PROJECT_ID;


const ENDPOINT = import.meta.env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';

const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT_ID)


const database = new Databases(client);
export const updateSearchCount = async (searchTerm, movie) =>{
    try{
        const results = await database.listDocuments(DATABASE_ID, COLLECTION_ID, [
            Query.equal('searchTerm', searchTerm),
        ]);

        if(results.documents.length > 0){
            const doc = results.documents[0];
            const newPoster = movie?.poster_path ? `https://image.tmdb.org/t/p/w500/${movie.poster_path}` : undefined;
            const needsPosterUpdate = newPoster && (!doc.poster_url || doc.poster_url.includes('placeholder.com') || doc.poster_url.includes('No+Image'));
            await database.updateDocument(DATABASE_ID, COLLECTION_ID, doc.$id, {
                count: (doc.count || 0) + 1,
                ...(needsPosterUpdate ? { poster_url: newPoster } : {}),
                title: movie?.title || doc.title,
                movie_id: movie?.id ?? doc.movie_id,
            });
        } else {
            // Attempt full payload first
                                    const fullPayload = {
                                            searchTerm,
                                            count: 1,
                                            movie_id: movie?.id,
                                            title: movie?.title,
                                            poster_url: movie?.poster_path
                                                ? `https://image.tmdb.org/t/p/w500/${movie.poster_path}`
                                                : '/no-movie.png', // local fallback
                                            vote_average: movie?.vote_average,
                                            release_date: movie?.release_date,
                                            original_language: movie?.original_language,
                                    };
            try {
                const created = await database.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), fullPayload);
                console.info('[Appwrite] Created new search doc', created.$id);
            } catch (err){
                if (err?.message?.includes('Unknown attribute')){
                    console.warn('[Appwrite] Collection missing some attributes (movie_id / poster_url). Creating minimal document.');
                    // Retry with minimal required fields only
                    const createdMinimal = await database.createDocument(DATABASE_ID, COLLECTION_ID, ID.unique(), {
                        searchTerm,
                        count: 1,
                        poster_url: '/no-movie.png',
                    });
                    console.info('[Appwrite] Created minimal search doc', createdMinimal.$id);
                } else {
                    throw err; // rethrow other errors
                }
            }
        }

    } catch (error){
        console.error(`Error updating search count: ${error}`);
    }
}

export const getTrendingMovies = async () => {
    try{
        const results = await database.listDocuments(DATABASE_ID, CLICKS_COLLECTION_ID, [
            Query.orderDesc("count"),
            Query.limit(5),
        ]);
        return results.documents;
    } catch (error){
        console.error(`Error fetching trending movies: ${error}`);
        return [];
    }
}

// Update poster_url for a movie if we have a better poster
export const updatePosterUrl = async (movieId, newPosterUrl) => {
    if(!movieId || !newPosterUrl) return;
    try {
        const results = await database.listDocuments(DATABASE_ID, CLICKS_COLLECTION_ID, [
            Query.equal('movie_id', movieId),
        ]);
        if(results.documents.length === 0) return;
        const doc = results.documents[0];
        if(doc.poster_url === newPosterUrl) return;
        await database.updateDocument(DATABASE_ID, CLICKS_COLLECTION_ID, doc.$id, { poster_url: newPosterUrl });
    } catch (e){
        console.error('Error updating poster url', e);
    }
}

// Track clicks per movie (by movie_id)
export const updateClickCount = async (movie) => {
    if(!movie?.id) return;
    try {
        let results = await database.listDocuments(DATABASE_ID, CLICKS_COLLECTION_ID, [
            Query.equal('movie_id', movie.id),
        ]);
        if(results.documents.length > 0){
            const doc = results.documents[0];
            const newPoster = movie.poster_path ? `https://image.tmdb.org/t/p/w500/${movie.poster_path}` : undefined;
            const needsPosterUpdate = newPoster && (!doc.poster_url || doc.poster_url.includes('placeholder.com') || doc.poster_url.includes('No+Image') || doc.poster_url.endsWith('/no-movie.png'));
            await database.updateDocument(DATABASE_ID, CLICKS_COLLECTION_ID, doc.$id, {
                count: (doc.count || 0) + 1,
                title: movie.title,
                ...(needsPosterUpdate ? { poster_url: newPoster } : {}),
            });
        } else {
            await database.createDocument(DATABASE_ID, CLICKS_COLLECTION_ID, ID.unique(), {
                movie_id: movie.id,
                title: movie.title,
                count: 1,
                poster_url: movie.poster_path ? `https://image.tmdb.org/t/p/w500/${movie.poster_path}` : '/no-movie.png',
            });
        }
    } catch (error){
        console.error('Error updating click count:', error);
    }
}