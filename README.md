# Movie Finder App

> **Disclaimer**: This project was created as a learning exercise but I includes additional features and modifications. Instead of searching, users can click on movie cards to view more details. The project was inspired by a tutorial from [JavaScript Mastery (JS Mastery)](https://www.jsmastery.pro/) on YouTube. All rights to the original tutorial content belong to JS Mastery.

---

## About the Project

Movie Finder is a React application that enables users to search for movies and explore trending titles. It leverages [The Movie Database (TMDb)](https://www.themoviedb.org/) API to fetch and display up-to-date movie information.

## Features

- **Movie Search**: Search for movies by entering keywords.
- **Trending Movies**: View a curated list of trending movies.
- **Debounced Search**: Reduces unnecessary API requests by debouncing user input.
- **Loading Indicator**: Displays a spinner during data fetching.
- **Robust Error Handling**: Notifies users of any issues with API requests.

## Technologies Used

- **React**: For building the user interface.
- **TMDb API**: Source of movie data.
- **Appwrite**: Backend service for managing trending movies and tracking search statistics.
- **react-use**: Utilized for debounce functionality.

---

## How to Duplicate and Create This Website

Follow these steps to set up your own version of the Movie Finder App:

1. **Clone the Repository**
    ```bash
    git clone <repository-url>
    cd movie-finder-app
    ```

2. **Install Dependencies**
    ```bash
    npm install
    ```

3. **Set Up Environment Variables**
    - Create a `.env` file in the root directory.
    - Add your TMDb API key and any other required environment variables:
      ```
      REACT_APP_TMDB_API_KEY=your_tmdb_api_key
      ```

4. **(Optional) Configure Appwrite**
    - Set up an [Appwrite](https://appwrite.io/) backend if you want to manage trending movies and track search statistics.
    - Update the relevant configuration in your project.

5. **Start the Development Server**
    ```bash
    npm start
    ```
    - The app will be available at `http://localhost:3000`.

6. **Build for Production**
    ```bash
    npm run build
    ```

7. **Customize**
    - Modify components, styles, or features as desired to make the project your own.

---

**Note:** Make sure to review the TMDb API documentation and usage policies before deploying your app.

