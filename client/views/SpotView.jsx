/** @jsx React.DOM */

var SpotView = React.createClass({

  getInitialState: function() {
    var hash = window.location.hash.substr(1);
    return {
      spotHash: hash,
      // Define default text for sharing a spot.
      shareProps: {
        contents: 'Check out this Spot! app.irl.events/#' + hash,
        subject: 'Check out irl',
        url: 'app.irl.events/#' + hash
      },
      spot: {},
      shareClass: "share-card-container",
      buttonIcon: "fa fa-share-alt",
      sharing: false,
      showChat: "",
      messages: []
    };
  },

  // Load spot's data from server via AJAX.
  // Load spot's chat messages via socket.
  componentDidMount: function() {
    var context = this;
    this.getSpot();
    var id = Number(this.state.spotHash.split('/spot/')[1]);
    this.setState({spotId: id});
    socket.emit('populateChat', id);
    socket.on('returnChat', function(data) {
      context.setState({messages: data});
    })
  },

  // Defines AJAX call to server to retrieve spot data.
  // Adds a new map marker if successful.
  getSpot: function() {
    var context = this;

    this.setState({loading: true});

    $.ajax({
      method: 'GET',
      url: '/api' + context.state.spotHash,
      dataType: 'json',
      success: function (data) {
        console.log("data: ", data);
        context.setState({spot: data});
        console.log("SUCCESS: ", context.state.spot);
        MetaController.setOGP({
          title: context.state.spot.name,
          description: context.state.spot.description
        });
        context.setState({loading: false});
        context.setState({creatorId: "/#/profile/" + data.creatorId});
        initMap(data.location, context, function(map, position, marker) {
          map.setOptions({zoomControl: false});
          marker.setIcon('/img/map/pin_test.png');
        });
        var durationTime = timeController.msToDuration(Number(data.end));
        console.log('durationTime', durationTime);
        context.setState({end: durationTime});
      },
      error: function (error) {
        console.log("ERROR: ", error);
        context.setState({loading: false});
      }
    });
  },

  // Open share card when user clicks Share button.
  toggleShare: function () {
    var sharing = !this.state.sharing;
    var newState = {sharing: sharing};
    if (this.state.buttonIcon === "fa fa-share-alt") {
      newState.buttonIcon = "fa fa-times",
      newState.shareClass = "share-card-container show-share-card"
    } else {
      newState.buttonIcon = "fa fa-share-alt",
      newState.shareClass = "share-card-container",
      newState.showChat = ""
    }
    this.setState(newState);
  },

  // Open chat card when user clicks chat button.
  toggleChat: function (){
    if(this.state.showChat === ""){
      this.setState({
        showChat: " show",
        buttonIcon: "fa fa-times"
      });
    } else {
      this.setState({
        showChat: "",
        buttonIcon: "fa fa-share-alt"
     });
    }
  },

  render: function() {

    var chatContainerClass = "chat-card-container";
    return (
      <div className="spot-container">
        <div className="create-map-view-container">
          <div id="map"></div>
        </div>
        <div className='spot-view-container'>
          <div className="spot-name-container">
            <div className='category-icon-container'>
              <i className={categories[this.state.spot.category] || categories.General}></i>
            </div>
            <span className='spot-name'>{this.state.spot.name}</span>
          </div>
          <h3>@{" " + timeController.msToTime(this.state.spot.start)}</h3>
          <p style={{'font-style': 'italic', 'font-size': '14px'}}>{this.state.end}</p>
          <h4>created by: <a href={this.state.creatorId} className="spot-view-creatorid">{this.state.spot.creator}</a></h4>
          <p>{this.state.spot.description}</p>
          <p>{this.state.spot.address}</p>
          <input type="button" value="show chat" onClick={this.toggleChat} />
        </div>
        <div className={this.state.shareClass} onClick={this.toggleShare}>
          <ShareCard shareProps={this.state.shareProps}/>
        </div>
        <div className="share-button-container">
          <a onClick={this.toggleShare} className="circle">
            <i className={this.state.buttonIcon}></i>
          </a>
        </div>

        <div className={chatContainerClass + this.state.showChat}>
          <Chat messages={this.state.messages} spotId={this.state.spotId}/>
        </div>

      </div>
    );
  }

});
