const video = document.getElementById("video");

Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
  faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
  faceapi.nets.faceRecognitionNet.loadFromUri("/models")
  // faceapi.nets.faceExpressionNet.loadFromUri("/models")
]).then(startVideo);

function startVideo() {
  navigator.getUserMedia(
    { video: {} },
    stream => (video.srcObject = stream),
    err => console.error(err)
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
    if (detections) {
      console.log(`Person(s): ${detections.length}`);
      let leftEye = detections[0].landmarks.getLeftEye();
      let rightEye = detections[0].landmarks.getRightEye();
      let mouth = detections[0].landmarks.getMouth();
      let nose = detections[0].landmarks.getNose();
      let jawLine = detections[0].landmarks.getJawOutline();
      // console.log("left eye: ", lefteye);
      // console.log("Right eye: ", rightEye);
      // console.log("Mouth: ", mouth);
      // console.log("Nose: ", nose);
      // console.log("Jawline: ", jawline);

      // ###############  OUTPUT ####################
      const tilt = calculateTilt(leftEye, rightEye);
      console.log("Tilt: ", tilt);
      const mouthSeparation = calculateMouthSeparation(mouth);
      console.log("Mouth: ", mouthSeparation);
      console.log("##################################");
    }
    const resizedDetections = faceapi.resizeResults(detections, displaySize);
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
    // faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
  }, 1000);
});

function calculateDirection(leftEye, rightEye, nose) {
  const leftEyeRightMostPoint = leftEye[4];
  const rightEyeLeftMostPoint = rightEye[0];
  const noseTopPoint = nose[0];
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
  if (separation > 80) {
    console.error("Yawning or Screaming for life");
  }
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
  const dir = heightDiff > 0 ? "right" : "left";
  return `${prob} ${dir}`;
}
