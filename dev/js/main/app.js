var app = angular.module('frontier', [
  'ngRoute', 'ngAnimate', 'ngSanitize','pubnub.angular.service','firebase'
]);


// TODO:
// 1. reset total influence on shared screen to 0 every turn (DONE)
// 2. show - hide ready button in join.html for each player's action (DONE)
// 3. change number of player on shared screen (right now it shows -1) (DONE)
// 4. run motion only run if 2nd player press the ready button first (DONE)
// 5. after clicked "continue" in join.html >> something should happen on the shared screen (DONE)
//    (total influences reset to 0, and displays global information) (DONE) 
// 6. if players are ready for the 2nd time, run turn 2 (DONE)
// 7. Firebase
// 8. move the species,motions json files and update the value
// 9. [Home.html] Turn 2 : total influences displays when 1 player vote (DONE)
// 10. [join.html] Species value increase everytime one plyer click "continue" button (DONE)
// 11. [join.html] "Continue" button shows up even before player submit vote (DONE)
// 12. If players reach TURN 5, shows final result, and WINNER ??????
//      Convert stats into scores (?)
// 13. Style the pages
// 14. [join.html] Shows voting form after click Ready button
// 15. Randomize species

app.config(['$routeProvider', '$locationProvider', function ($routeProvider, $locationProvider) {
  $routeProvider
    // Home
    .when("/", {templateUrl: "partials/home.html"})
    .when("/join", {templateUrl: "partials/join.html"});
    // Pages

    $locationProvider.html5Mode({
      enabled: false,
      requireBase: false
    });
}]);

app.controller('MainCtrl', ['$sce','$http','$scope','$location','$rootScope','$window','Pubnub','$firebaseArray',function($sce,$http, $scope, $location, $rootScope, $window, Pubnub,$firebaseArray){
	$scope.go = function ( path ) {
	  $location.path( path );
	};

}]);

app.controller('GameCtrl',['$rootScope','$scope','Pubnub','$firebaseArray',function($rootScope,$scope,Pubnub,$firebaseArray){
  $scope.messages = [];
  $scope.presences = [];
  $scope.votes = [];
  $scope.playerTurns=[];
  $scope.speciesVal = 1;
  $scope.totalInfluences = 0;
  $rootScope.numPlayers=0;

  $scope.startGame = function(){
    $scope.uuid = Math.random(100).toString();
    Pubnub.init({
      publish_key: 'pub-c-ae9aadc9-90d8-4e74-9a27-7d939ba17845',
      subscribe_key: 'sub-c-65f9ff5c-da08-11e7-96a8-ea37cc28f519',
      uuid: $scope.uuid
    });

    $scope.rand = Math.floor(Math.random() * 10000) + 1000;
    $scope.channel = 'game-'+$scope.rand;
    $scope.hideStartGame = true;

    firebase.database().ref('gameChannel').child($scope.channel).set({
      id : $scope.rand
    }); 

    $scope.slicedUUID = $scope.uuid.slice(2);
    firebase.database().ref('gameChannel').child($scope.channel+'/players/player-' + $scope.slicedUUID).set({
      uuid : $scope.uuid,
      speciesId : 'screen'
    });

    Pubnub.subscribe({
       channel: $scope.channel,
       // callback:function(m){
       //  console.log('startGame subscribe');
       //  console.log(m);
       // }
       triggerEvents:['callback'],
       presence:function(presenceEvent){
        // $scope.pushPresence(presenceEvent);
        Pubnub.here_now({
            channel: $scope.channel,
            state: true,
            callback: $scope.pushPresence
        });
       }
    });

    // Listening to the callbacks
    $scope.$on(Pubnub.getMessageEventNameFor($scope.channel), function (ngEvent, m) {
       $scope.$apply(function () {
           if(m.type=='state'){
              $scope.messages.push(m);
              console.log($scope.messages.length);
              if($scope.messages.length%2==0){
               $scope.runMotion();
              } 
           } else if(m.type=='vote'){
              $scope.votes.push(m);
              // !!!! clear votes[] each turn
              $scope.countInfluence(m.content);
           } else if(m.type=='endTurn'){
              $scope.playerTurns.push(m);
              if($scope.playerTurns.length%2==0){
                $scope.turnSession = false;
                $scope.speciesVal+=1;
              }
              
              // empty the votes
           }
       });
    });

    $scope.$on(Pubnub.getPresenceEventNameFor($scope.channel), function(ngEvent, presenceEvent) {
        $scope.$apply(function () {
           $scope.presences.push(presenceEvent);
       });
    });

    // console.log($scope.messages);
    // console.log($scope.presences);

    $scope.pushPresence = function(presenceEvent){
      $scope.presences.push(presenceEvent);
      $scope.$apply();
      console.log(presenceEvent);
      console.log($scope.presences);
    };

  // endof startGame  
  };

  $scope.turnCounter=0;

  $scope.gameId = "";
  $scope.joinGame = function(){
    console.log('click');
    $scope.uuid = Math.random(100).toString();
    Pubnub.init({
      publish_key: 'pub-c-ae9aadc9-90d8-4e74-9a27-7d939ba17845',
      subscribe_key: 'sub-c-65f9ff5c-da08-11e7-96a8-ea37cc28f519',
      uuid: $scope.uuid
    });

    $rootScope.numPlayers+=1;
    // $scope.numPlayers.$apply();
    $scope.joinTrue = true;
    $scope.channel = 'game-'+$scope.gameId;

    $scope.slicedUUID = $scope.uuid.slice(2);
    $scope.assignID($scope.slicedUUID,$scope.channel);

    // Subscribing to the ‘messages-channel’ and trigering the message callback
    Pubnub.subscribe({
       channel: $scope.channel,
       // callback:function(m){
       //  console.log('msubscribe');
       //  console.log(m);
       // }
       triggerEvents:['callback'],
       presence:function(presenceEvent){
        Pubnub.here_now({
            channel: $scope.channel,
            state: true,
            callback: $scope.pushPresence
        });
       }
    });

    // Listening to the callbacks
    $scope.$on(Pubnub.getMessageEventNameFor($scope.channel), function (ngEvent, m) {
       $scope.$apply(function () {
           if(m.type=='state'){
              $scope.messages.push(m);
              console.log($scope.messages.length);
              if($scope.messages.length%2==0){
               $scope.runMotion();
              } 
           } else if(m.type=='vote'){
              $scope.votes.push(m);
              // !!!! clear votes[] each turn
              $scope.countInfluence(m.content);
           } else if(m.type=='endTurn'){
              $scope.playerTurns.push(m);
              if($scope.playerTurns.length%2==0){
                $scope.turnSession = false;
                $scope.speciesVal+=1;
              }
              
           }

       });
    });
    $scope.$on(Pubnub.getPresenceEventNameFor($scope.channel), function(ngEvent, presenceEvent) {
        $scope.$apply(function () {
           $scope.presences.push(presenceEvent);
       });
    });
    // console.log($scope.messages);
    // console.log($scope.presences);

    $scope.pushPresence = function(presenceEvent){
      $scope.presences.push(presenceEvent);
      $scope.$apply();
      // console.log(presenceEvent);
      // console.log($scope.presences);
    };

  // endof joinGame
  };

  $scope.assignID = function(uuid,channel){
      console.log(uuid+', '+channel);

      return firebase.database().ref('gameChannel/'+channel+'/players').once('value').then(function(snapshot) {
        console.log("numChildren "+snapshot.numChildren()+" ");
        var asid = (snapshot.numChildren()===2) ? 0 : 1;
        console.log("The ID is "+asid+" ");
        firebase.database().ref('gameChannel').child(channel+'/players/player-' + uuid).set({
          uuid : uuid,
          speciesId : asid
        });
        $scope.showProfile(uuid,channel,asid);
      });
      
  };

  $scope.showProfile = function(uuid,channel,specID){
    var ref = firebase.database().ref('species');
    var data= $firebaseArray(ref);
    var dataisi = {};

    data.$loaded().then(function() {
        $scope.itemDetail = data[specID];
        dataisi = data[specID];
        firebase.database().ref('gameChannel').child(channel+'/players/player-' + uuid).update({
           'species/class' : dataisi.class,
           'species/habitat' : dataisi.habitat,
           'species/name' : dataisi.name,
           'species/type' : dataisi.type,
           'species/stats/energy' : dataisi.stats.energy,
           'species/stats/food' : dataisi.stats.food,
           'species/stats/influence' : dataisi.stats.influence,
           'species/stats/land' : dataisi.stats.land,
           'species/stats/population' : dataisi.stats.population
        });
        // To iterate the key/value pairs of the object, use angular.forEach()
        // angular.forEach(data, function(value, key) {
        //   // console.log(key, value);
        // });
    });
  };

  $scope.sendMessage = function() {
    $scope.readyState=true;
    Pubnub.publish({
         channel: $scope.channel,
         message: {
             content: $scope.readyState,
             sender_uuid: $scope.uuid,
             type:'state',
             date: new Date()
         },
         callback: function(m) {
             // console.log(m);
         }
    });
    // Reset the messageContent input
    $scope.readyState = '';
    
  // endof sendMessage
  };

  
  $scope.runMotion = function(){
    console.log('run motion');
    $scope.turnCounter += 1;
    $scope.turnSession = true;
    $scope.totalInfluences = 0;
    $scope.submitted = false;
    $scope.votingStatus = false;
  };


  // VOTING
  $scope.influences='';
  $scope.votingStatus = '';
  $scope.submitted = false;
  $scope.sendVote = function(){
    $scope.submitted = true;
    console.log($scope.submitted);

    Pubnub.publish({
         channel: $scope.channel,
         message: {
             content: $scope.influences,
             sender_uuid: $scope.uuid,
             type:'vote',
             date: new Date()
         },
         callback: function(m) {
             // console.log(m);
         }
    });
  // endof sendVote()
  };

  $scope.countInfluence = function(num){
    $scope.totalInfluences+=parseInt(num);
    console.log($scope.totalInfluences);
    console.log($scope.votes);

    // votingStatus = if both players already vote
    if($scope.votes.length%2!=0){
        $scope.votingStatus = false;
    } else {
        $scope.votingStatus = true;
    }

    if($scope.turnSession==false){$scope.totalInfluences = 0;}
  // endof countInfluence()  
  };

  $scope.finishMotion = function(){
    // turn session = if both players are ready
    $scope.turnSession = false;
    $scope.totalInfluences = 0;
    $scope.influences=0;
    
    Pubnub.publish({
         channel: $scope.channel,
         message: {
             content: 'something',
             sender_uuid: $scope.uuid,
             type:'endTurn',
             date: new Date()
         },
         callback: function(m) {
             // console.log(m);
         }
    });

  // endof finishMotion()
  };


// endof GameCtrl  
}]);

app.controller('JoinCtrl',['$rootScope','$scope','Pubnub','$location',function($rootScope,$scope,Pubnub,$location){
  
// endof JoinCtrl
}]);


app.controller('HomeCtrl', ['$http','$location','$scope',function($http, $location, $scope, $rootScope){

}]);

app.directive('nav', ['$location',function($location){
  return{
    restrict : 'E',
    templateUrl:'partials/nav.html'
  };
}]);