import React, { useEffect, useState } from "react";
import { getLoginData, isAuthenticated } from "../../services/LoginData";
import { Modal, Button } from "react-bootstrap";
import Skeleton from "react-loading-skeleton"; // Ensure this is installed
import "react-loading-skeleton/dist/skeleton.css";
import "./Dashboard.css"; // Ensure this CSS file is properly styled
import { ChevronRight, ChevronLeft } from "react-bootstrap-icons"; // Importing chevron icons
import { useNavigate } from 'react-router-dom';

const DashboardComponent: React.FC = () => {
  const [data, setData] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true); // Loading state
  const [selectedTweet, setSelectedTweet] = useState<string | null>(null); // Selected tweet for editing
  const [showModal, setShowModal] = useState<boolean>(false); // Modal state
  const [tweetIndex, setTweetIndex] = useState<number | null>(null); // Track which tweet is selected for editing
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([
    "eToro",
  ]); // Allow multiple selections
  const navigate = useNavigate();

  const postToX = () => {
    fetch('http://localhost:4000/api/postOnX', { 
      method: 'POST', 
      headers: {
        'Content-Type': 'application/json'
      }, 
      body: JSON.stringify({
        content: 'hello world'
      })
    })    
  };

  useEffect(() => {
    // Check if user is authenticated
    if (!isAuthenticated()) {
      // User is not authenticated
      navigate('/login');
      return;
    }

    const username = getLoginData()?.username;
    fetch(`http://localhost:4000/api/getSuggestedPosts?userName=${username}`)
      .then(response => response.json())
      .then(data => {
        console.log("result", data);
        setData(data.result); // Store the result in state
        setLoading(false); // Set loading to false after fetching data
      })
      .catch((error) => {
        console.error("There was an error making the request!", error);
        setLoading(false); // Ensure loading state is updated on error
      });
  }, []);

  const handleEdit = (tweet: string, index: number) => {
    setSelectedTweet(tweet);
    setTweetIndex(index); // Set the index of the tweet to edit
    setShowModal(true); // Show the modal for editing
  };

  const handlePost = () => {
    if (tweetIndex !== null) {
      // setData((prevData) =>
      //   prevData.map((tweet, index) =>
      //     index === tweetIndex ? selectedTweet : tweet,
      //   ),
      // );
    }
    setShowModal(false); // Close the modal
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
          <h1>Generating Posts...</h1>
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
          <h1>Suggested Posts</h1>
          {data.map((tweet, index) => (
            <div
              key={index}
              className="tweet-card p-3 d-flex justify-content-between align-items-center"
            >
              {" "}
              {/* Flexbox for alignment */}
              <p className="m-0">{tweet}</p>
              <button
                onClick={() => handleEdit(tweet, index)} // Pass index to identify tweet
                className="btn btn-link text-white"
                aria-label="Edit Tweet"
              >
                <ChevronRight />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal for editing tweet */}
      <Modal
        show={showModal}
        onHide={() => setShowModal(false)}
        size="lg"
        aria-labelledby="contained-modal-title-vcenter"
        centered
      >
        <Modal.Header>
          <button
            className="btn btn-link"
            onClick={() => setShowModal(false)}
            aria-label="Close"
          >
            <ChevronLeft />
          </button>
          <Modal.Title>Edit Post</Modal.Title>
          <Button
            variant="primary"
            onClick={handlePost}
            disabled={isPostDisabled}
            className="post-button ml-auto"
          >
            Post
          </Button>
        </Modal.Header>
        <Modal.Body>
          <textarea
            value={selectedTweet || ""}
            onChange={(e) => setSelectedTweet(e.target.value)}
            className="form-control"
            rows={5}
          />
          <hr /> {/* Thin border */}
          <h5 className="mt-2">Post in</h5> {/* Title */}
          <div className="mb-3">
            <div
              className="btn-group"
              role="group"
              aria-label="Platform selection"
            >
              <button
                type="button"
                className={`network-button btn ${selectedPlatforms.includes("eToro") ? "btn-light-green" : "btn-grey"} rounded-circle mx-2`}
                onClick={() => handlePlatformSelect("eToro")}
              >
                eToro
              </button>
              <button
                type="button"
                className={`network-button btn ${selectedPlatforms.includes("X") ? "btn-light-green" : "btn-grey"} rounded-circle mx-2`}
                onClick={() => handlePlatformSelect("X")}
              >
                X
              </button>
            </div>
          </div>
          {/* Removed Post button from here, it is now in Header */}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default DashboardComponent;
