const video = document.getElementById("video");
var node_tilt = document.getElementById("tilt");
var node_dir = document.getElementById("direction");
var node_mouth = document.getElementById("mouth");
var node_error = document.getElementById("error");
var node_faces = document.getElementById("faces");
var node_title = document.getElementById("title");

const REFRESH_INTERVAL = 500;

/**
 * Wait for promise to resolve for all models
 */
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromDisk("./models"),
  faceapi.nets.faceLandmark68Net.loadFromDisk("./models"),
  faceapi.nets.faceRecognitionNet.loadFromDisk("./models")
  // faceapi.nets.faceExpressionNet.loadFromUri("/models")
]).then(startVideo);

/**
 * Capture stream
 */
function startVideo() {
  navigator.getUserMedia(
    { video: {} },
    stream => (video.srcObject = stream),
    err => {
      node_error.innerHTML = "Video stream error. Try refreshing page";
      console.error("Video stream Error: ", err);
    }
  );
}

video.addEventListener("play", () => {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.body.append(canvas);
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);
  setInterval(async () => {
    const detections = await faceapi
      .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks();
    // .withFaceExpressions();
    node_title.innerHTML = `Model output (refreshes every ${REFRESH_INTERVAL}ms)`;
    if (detections) {
      if (detections.length === 0) {
        node_faces.innerHTML = 0;
        node_error.innerHTML =
          "No face detected. Try adjusting light exposure or posture.";
      } else if (detections.length > 1) {
        node_faces.innerHTML = detections.length;
        node_error.innerHTML = `${detections.length} people detected. Disabling calculations`;
      } else {
        node_error.innerHTML = "NA";
        node_faces.innerHTML = 1;
        const { leftEye, rightEye, mouth, nose, jawLine } = extractLandmarks(
          detections[0]
        );
        // Output
        renderOutput(leftEye, rightEye, nose, mouth);
        // Draw detections on canvas
        // if (detections.length === 1) {
        //   const resizedDetections = faceapi.resizeResults(
        //     detections,
        //     displaySize
        //   );
        //   canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
        //   faceapi.draw.drawDetections(canvas, resizedDetections);
        //   faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
        //   // faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
        // }
      }
    } else {
      node_error.innerHTML =
        "Something went wrong. Models did not recognise anything.";
    }
  }, REFRESH_INTERVAL);
});

/**
 * Extract face landmarks for using in calculations
 * @param {*} detection Coordinates object from face-api
 */
function extractLandmarks(detection, debug = false) {
  const leftEye = detection.landmarks.getLeftEye();
  const rightEye = detection.landmarks.getRightEye();
  const mouth = detection.landmarks.getMouth();
  const nose = detection.landmarks.getNose();
  const jawLine = detection.landmarks.getJawOutline();
  if (debug) {
    console.log(leftEye, rightEye, nose, mouth, jawLine);
  }
  return { leftEye, rightEye, mouth, nose, jawLine };
}

function renderOutput(leftEye, rightEye, nose, mouth) {
  node_tilt.innerHTML = calculateTilt(leftEye, rightEye);
  node_dir.innerHTML = calculateDirection(leftEye, rightEye, nose);
  node_mouth.innerHTML = calculateMouthSeparation(mouth);
}

/**
 * Calculating direction of head using eye corners and nose tip coordinates
 */
function calculateDirection(leftEye, rightEye, nose) {
  const leftEyeRightMostPoint = leftEye[3];
  const rightEyeLeftMostPoint = rightEye[0];
  const noseTopPoint = nose[0];
  const leftGap = noseTopPoint.x - leftEyeRightMostPoint.x;
  const rightGap = rightEyeLeftMostPoint.x - noseTopPoint.x;
  const gapDelta = leftGap - rightGap;
  const absGap = Math.abs(gapDelta);
  const dir = gapDelta < 0 ? "Right" : "Left";
  return absGap < 5 ? "Center" : absGap < 15 ? `Slightly ${dir}` : `To ${dir}`;
}

/**
 * Gap in inner circle tells if mouth is open or not.
 * Point description - 20 points in total.
 * 0-11 > Outer circle. Clockwise - starting from left tip of mouth
 * 12-19 > Inner circle. Clockwise - starting from left tip of lips.
 * @param mouth mouth points from lib
 */
function calculateMouthSeparation(mouth) {
  const topLipCenter = mouth[14];
  const bottomLipCenter = mouth[18];
  const separation = bottomLipCenter.y - topLipCenter.y;
  return separation < 5 ? "Closed" : separation < 15 ? "Slightly open" : "Open";
}

/**
 * Calculate using distance between eye and chin points from jawline.
 * TODO: Add a multiplier based on distance to change thresholds for
 * other calculations.
 */
function calculateDistance() {}

/**
 * Calculate neck tilt by measuring horizontal eye alignment.
 * Can be improved by adding nose slope into consideration.
 * Points description - 6 points in total
 * 2 top, 2 bottom, 2 tips. Clockwise from left tip of eye.
 * @param leftEye leftEye points from lib
 * @param rightEye rightEye points from lib
 */
function calculateTilt(leftEye, rightEye) {
  const leftEyeLeftMostPoint = leftEye[0];
  const rightEyeRightMostPoint = rightEye[4];
  const heightDiff = leftEyeLeftMostPoint.y - rightEyeRightMostPoint.y;
  const prob = Math.abs(heightDiff) <= 10 ? "Slightly" : "To";
  const dir = heightDiff > 0 ? "Right" : "Left";
  return `${prob} ${dir}`;
}
