// FitmoScore module used to draw the Fitmo Score.
//
// How to use:
//   - call FitmoScore.init();
//   - call FitmoScore.draw();
//
// The init method accepts, optionally, a string and integer
// representing the id of the element the score will be drawn into and the overall size of it.
// It also accepts an optional errorCompensation integer user for setting/removing offsets of the outermost ring marks
//
//
// The draw method requires a JSON string object representing the score's.
// This must be the individual data to be represented, i.e:
//   {"nutrition":33,"physical":0,"lifestyle":0,"mental":0,"total":25}

window.FitmoScore = (function(){

  // Properties for the 'canvas' used to draw the score.
  // container: string, used to query the DOM element. Must be id.
  // size: integer, Width+Height of the canvas
  var canvas = {
    container : 'canvas',
    size      : 300
  }

  // Private properties used to draw and assign colors to the arcs. Do not modify.
  var properties = {
    // Defines the categories present in the Fitmo Score graph as well as their order.
    order: ['lifestyle', 'mental', 'physical', 'nutrition', 'total'],

    // Colors for each of the arcs of the score.
    colors: {
      physical  : "#FFCC00",
      nutrition : "#99CC00",
      mental    : "#FF9900",
      lifestyle : "#FF3300",
      total     : "#46BFEC"
    }
  };

  // Arc properties to calculate the size of the different arcs.
  //
  // totalTrackWidth: width of the outermost arc
  // totalArcWidth: width of the outermost arc that sits on top of the track (previous) arc
  // innerArcWidth: width for *all* the inner arcs
  // innerArcRadius: radius for *all* the inner arcs
  // totalArcWidth: radius for the outermost arc that sits on top of the track arc
  // textSize: Font size for the text drawn in the middle of the arc
  // decreaseBy: How much to decrease the starting point of the arc. Used for drawing inner arcs
  var arcProperties = {
    totalTrackWidth : 35,
    totalArcWidth   : 38,
    innerArcWidth   : 10,
    innerArcRadius  : 80,
    totalArcRadius  : 100,
    textSize        : 30,
    decreaseBy      : 10
  }

  // ------------------------------
  //       Private methods
  // ------------------------------


  // Initialize Fitmo Score
  function Canvas(newCanvasProperties, errorCompensation, isMobile) {
    // arcProperties & canvas.size are mutable global objects that are modified every time a new arc is drawn.
    // Therefore, after every initialization the values need to be reset.
    this.isMobile = isMobile || false;
    canvas.size   = 300;
    arcProperties = {
      totalTrackWidth : 35,
      totalArcWidth   : 38,
      innerArcWidth   : 10,
      innerArcRadius  : 80,
      totalArcRadius  : 100,
      textSize        : 30,
      decreaseBy      : 10
    }

    // Override canvas DOM container.
    // Override dimensions overall dimensions of the Fitmo Score if a new size is passed as argument.
    if (typeof newCanvasProperties === 'object') {

      if (newCanvasProperties.size) {
        if (canvas.size > newCanvasProperties.size) {
          magnitude = canvas.size / newCanvasProperties.size;
        }
        else if (canvas.size < newCanvasProperties.size) {
          magnitude = newCanvasProperties.size / canvas.size;
        }

        for (property in arcProperties) {
          arcProperties[property] = (canvas.size > newCanvasProperties.size ? arcProperties[property] / magnitude : arcProperties[property] * magnitude)
        }
      }

      canvas.container = newCanvasProperties.container || canvas.container;
      canvas.size      = newCanvasProperties.size || canvas.size;
    }

    // Set initializer attribute errorCompensation.
    // Used for setting/removing offsets of the outermost ring marks
    // by adding an error compensation to the calculated radius value.
    if (typeof errorCompensation === 'number') {
      this.errorCompensation = errorCompensation;
    }

    // Require Raphael.js
    if (typeof Raphael === 'undefined') {
      throw "Raphael.js not included.";
    }

    var canvasEl = document.getElementById(canvas.container);

    // Ensures that there are no traces of a previous (old) Fitmo Score in the DOM.
    if (canvasEl.hasChildNodes()) {
      this.redraw = true;

      while (canvasEl.childNodes.length >= 1) {
        canvasEl.removeChild(canvasEl.firstChild);
      }
    }

    // Initialize Raphael and set it to as the paper property to the Canvas class
    this.paper = Raphael(canvas.container, canvas.size, canvas.size);

    // Set custom attributes for 'paper', these represent the arc or ring to draw.
    // Calculate and return the path the drawings should follow.
    this.paper.ca.arc = function(xloc, yloc, value, total, R) {
      var alpha = 360 / total * value,
          a = (90 - alpha) * Math.PI / 180,
          x = xloc + R * Math.cos(a),
          y = yloc - R * Math.sin(a),
          path;

      if (total === value) {
        path = [
          ["M", xloc, yloc - R],
          ["A", R, R, 0, 1, 1, xloc - 0.01, yloc - R]
        ];
      }
      else {
        path = [
          ["M", xloc, yloc - R],
          ["A", R, R, 0, +(alpha > 180), 1, x, y]
        ];
      }

      return {
        path: path
      }
    }
  }


  // Draws the first outermost arc.
  // This arc will represent the 'track' to follow by the second outermost arc
  // (the so called 'total' arc), which will be on top of this one.
  //
  // arc properties: X, Y, draw from 0 to, drawing limit, radius
  var drawOutermostRingTrack = function(paper) {
    paper.path().attr({
      stroke         : '#FFF',
      'stroke-width' : arcProperties.totalTrackWidth,
      arc            : [(canvas.size / 2), (canvas.size / 2), 100, 100, arcProperties.totalArcRadius]
    });
  }


  // Draws the dotted marks surrounding the outermost arc.
  //
  // arguments =>
  //    paper   = Raphael object
  //    R       = Radius
  //    density = the number of dots stuffed within the total radius
  //    errorCompensation = In case an offset occurs a compensation to the radius can be passed as an extra argument.
  var drawOutermostRingMark = function(paper, R, density, errorCompensation) {
    var color  = "hsb(".concat(Math.round(R) / 200, ", 1, .75)"),
        result = paper.set(),
        R      = R + (errorCompensation || 0)

    for (var value = 0; value < density; value++) {
      var alpha = 360 / density * value,
          a = (90 - alpha) * Math.PI / 180,
          x = (canvas.size / 2)  + R * Math.cos(a),
          y = (canvas.size / 2) - R * Math.sin(a),
          marksAttr = { fill: "#BBB", stroke: "none" };

      result.push(paper.circle(x, y, 1).attr(marksAttr));
    }

    return result;
  }


  // Draws the outermost arc on top of the previous 'track' arc
  // as well as the inner arcs, which represent the different
  // categories of the Fitmo Score.
  var drawScores = function(paper, score, redraw, isMobile) {
    // Iterate through all the Fitmo Score categories, defined in properties's order
    for (var i = 0; i < properties.order.length; i += 1) {
      var category = properties.order[i],
          redraw   = redraw || false;

      var arc = paper.path().attr({
        stroke         : properties.colors[category],
        'stroke-width' : (category === 'total' ? arcProperties.totalArcWidth : arcProperties.innerArcWidth),
        arc: [
          (canvas.size / 2), // X coordinate
          (canvas.size / 2), // Y coordinate
          (score[category] === 0 ? 1 : score[category]),  // Draw until
          100,  // Arc limit
          (category === 'total' ? arcProperties.totalArcRadius : arcProperties.innerArcRadius -= arcProperties.decreaseBy) // Radius
        ]
      });

      // Simulate a CSS drop-shadow effect by applying a dark, opaque glow to the arc
      if (category !== 'total') {
        arc.glow({width: 1, opacity: 0.05}).attr({
          arc: [
            (canvas.size / 2) + 4, // Adds a 4px offset to the glow in order to simulate the 'shadow'
            (canvas.size / 2),
            (score[category] === 0 ? 0 : score[category] - 1), // Draws back the glowing 1px of the original size in order to simulate the 'shadow'
            100,
            arcProperties.innerArcRadius
          ]
        });
      }
    }


    // There is some weird behaviour going on with the SVG generated by Raphael.js.
    // When the SVG is redrawn, regardless of whether the container was removed from the DOM or not
    // the text() method is redrawn at the very bottom of its container, in other words, the y argument
    // is completely ignored. In order to address this issue a 'redraw' flag is used and a correction of
    // roughly the half of the original size is used to properly draw the text object.
    //
    // However, the problem doesn't stop there. Ext.js uses DOM creation/deletion heavily, and thus, when
    // pushing and poping views the redraw glitch is not triggered, but creating a new instance of the view does.
    // Since both cases are heavily used on mobile the task of displaying the text has been delegated to plain JS.
    if (isMobile) {
      var canvasEl       = document.getElementById(canvas.container),
          textPosWrapper = document.createElement('div'),
          textWrapper    = document.createElement('div'),
          text           = document.createElement('p');

      textPosWrapper.className = 'score-text-wrapper';
      textWrapper.className = 'score-text';
      text.innerHTML = score.total;

      textWrapper.appendChild(text);
      textPosWrapper.appendChild(textWrapper);
      canvasEl.appendChild(textPosWrapper);
    }
    else {
      paper.text().attr({
        'font-size'   : arcProperties.textSize,
        'font-weight' : 'bold',
        'font-family' : 'Sanuk-BlackSCRegular',
        fill          : '#666',
        text          : score.total,
        x             : canvas.size / 2,
        y             : redraw ? ((canvas.size / 2) / 2) + 3.5 : canvas.size / 2
      });
    }
  }

  // Getter for private variable canvas.
  var getCanvas = function() {
    return canvas;
  }


  // Calls several private methods in order to draw the Fitmo Score.
  Canvas.prototype.draw = function(score) {

    if (typeof score === 'undefined') {
      throw "Error: Please provide a score data object in JSON format.";
    }

    var canvas   = getCanvas(),
        center   = (canvas.size / 2);

    drawOutermostRingTrack(this.paper);

    drawOutermostRingMark(this.paper, (center - arcProperties.totalTrackWidth), (arcProperties.totalArcRadius + 30), this.errorCompensation || 2);
    drawOutermostRingMark(this.paper, (center - arcProperties.totalTrackWidth * 2), arcProperties.totalArcRadius, this.errorCompensation + 1 || 3);
    drawScores(this.paper, score, this.redraw, this.isMobile);
  }

  // ------------------------------
  //       Public methods
  // ------------------------------
  return {
    init: Canvas,
    draw: Canvas.prototype.draw
  }

}());