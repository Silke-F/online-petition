// browser code

console.log("hello from signature-canvas.js");

const canvas = document.getElementById("signature");
const context = canvas.getContext("2d");

console.log("canvas", canvas);

let oldMousePosition = {
  left: 0,
  top: 0,
};

let mouseIsDown = false;

function drawTo(newMousePosition) {

  if(mouseIsDown) {
  context.beginPath();
  context.moveTo(oldMousePosition.left, oldMousePosition.top);
  context.lineTo(newMousePosition.left, newMousePosition.top);
  context.closePath();
  context.stroke();

  }

  console.log("mousedown", mouseIsDown);
  console.log("oldmouseposition", oldMousePosition);
  console.log("newmouseposition", newMousePosition);

  oldMousePosition = newMousePosition;



  $("[name=signature_code]").val(canvas.toDataURL());
}

function clearCanvas() {
  context.clearRect(0, 0, canvas.width, canvas.height);
}

$("#signature").on("mousemove", (event) => {
  const mousePosition = {
    left: event.clientX,
    top: event.clientY
};

  const signaturePosition = $("#signature").offset();

  const newMousePosition = {
    left: mousePosition.left - signaturePosition.left,
    top: mousePosition.top - signaturePosition.top + $(document).scrollTop()
  };

  console.log("mousePosition.left", mousePosition.left);
  console.log("signaturePosition.left", signaturePosition.left);


  drawTo(newMousePosition);
});


$("#clear-signature").on("click", (event) => clearCanvas());
$("#signature").on("mousedown", (event) => mouseIsDown = true);
$("#signature").on("mouseup", (event) => mouseIsDown = false);

// TODO: make sure that the signing only happens when the mousebutton is clicked
