// Dashboard.tsx
import React, { useEffect, useState } from "react";
import { getLoginData, isAuthenticated } from "../../services/LoginData";
import Skeleton from "react-loading-skeleton"; // Ensure this is installed
import "react-loading-skeleton/dist/skeleton.css";
import "./Dashboard.css"; // Ensure this CSS file is properly styled
import { ChevronRight } from "react-bootstrap-icons"; // Importing chevron icons
import { useNavigate } from 'react-router-dom';
import EditModal from '../EditModalComponent/EditModal'; // Import the EditModal component
import { fetchSuggestedPosts, postToX, postToEtoro, getSuggestedPostsPrompt } from '../../services/PostsService'; // Import the service functions

const DashboardComponent: React.FC = () => {
  const [data, setData] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // Loading state
  const [selectedTweet, setSelectedTweet] = useState<string | null>(null); // Selected tweet for editing
  const [showModal, setShowModal] = useState<boolean>(false); // Modal state
  const [tweetIndex, setTweetIndex] = useState<number | null>(null); // Track which tweet is selected for editing
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["eToro", "X"]); // Allow multiple selections
  const navigate = useNavigate();
  const domain = process.env.REACT_APP_SERVER_DOMAIN;
  const [postedTweets, setPostedTweets] = useState<number[]>([]);
  
  const loginData = getLoginData();

  const init = async () => {
    const isUserAuthenticated = await isAuthenticated();
    if (!isUserAuthenticated) {
      navigate('/login');
      return;
    }

    const username: string = getLoginData().username;
    try {
      const data = await fetchSuggestedPosts(username, getSuggestedPostsPrompt());
      setData(data.result); // Store the result in state
      setLoading(false); // Set loading to false after fetching data
    } catch (e) {
      console.error("There was an error making the request!", e);
      setLoading(false); // Ensure loading state is updated on error
    }
  }

  useEffect(() => {
    // Check if user is authenticated
    init();
  }, []);

  const handleEdit = (tweet: string, index: number) => {
    setSelectedTweet(tweet);
    setTweetIndex(index); // Set the index of the tweet to edit
    setShowModal(true); // Show the modal for editing
  };

  const handlePost = async () => {
    const isxSelected = selectedPlatforms.includes('X')
    const iseToroSelected = selectedPlatforms.includes('eToro')

    if (isxSelected) {
      await postToX(selectedTweet);
    }

    if (iseToroSelected) {
      await postToEtoro(selectedTweet, loginData);
    }
    setShowModal(false); // Close the modal
    setPostedTweets([...postedTweets, tweetIndex!]);
  };

  // Handle the platform selection
  const handlePlatformSelect = (platform: string) => {
    setSelectedPlatforms(
      (prev) =>
        prev.includes(platform)
          ? prev.filter((p) => p !== platform) // Deselect if already selected
          : [...prev, platform], // Select if not selected
    );
  };

  // Check if at least one platform is selected
  const isPostDisabled = selectedPlatforms.length === 0;

  return (
    <div className="bg-dark text-white p-4">
      {loading ? (
        <div className="tweets-container">
          <h1 className="dashboard-title">Generating Posts...</h1>
          {[...Array(5)].map(
            (
              _,
              index, // Skeleton loader for 5 tweets
            ) => (
              <div key={index} className="tweet-card p-3">
                <Skeleton
                  count={1}
                  height={10}
                  style={{ marginBottom: "10px", backgroundColor: "#BCC1D1" }}
                />
                <Skeleton
                  count={1}
                  height={10}
                  style={{ backgroundColor: "#BCC1D1", width: "80%" }}
                />
              </div>
            ),
          )}
        </div>
      ) : (
          <div className="tweets-container">
          <h1 className="dashboard-title">Suggested Posts</h1>
          {data.map((tweet, index) => (
            <div
              key={index}
              className="tweet-card p-3 d-flex justify-content-between align-items-center"
              onClick={() => handleEdit(tweet, index)} // Handle click for the entire container
              style={{ cursor: 'pointer' }} // Change cursor to pointer to indicate clickability
            >
              <p className="m-0">{tweet}</p>
              <button
                className="btn btn-link text-white"
                aria-label="Edit Tweet"
              >
                <ChevronRight />
              </button>
              {postedTweets.includes(index) &&
              <span className="post-success">
                <i className="bi bi-check-circle-fill"></i> {/* Bootstrap icon */}
              </span>
              }
            </div>
          ))}
        </div>
      )}

      {/* Modal for editing tweet */}
      <EditModal
        showModal={showModal}
        selectedTweet={selectedTweet}
        selectedPlatforms={selectedPlatforms}
        isPostDisabled={isPostDisabled}
        handleClose={() => setShowModal(false)}
        handlePost={handlePost}
        handlePlatformSelect={handlePlatformSelect}
        setSelectedTweet={setSelectedTweet}
      />
    </div>
  );
};

export default DashboardComponent;