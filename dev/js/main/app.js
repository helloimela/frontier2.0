var app = angular.module('frontier', [
  'ngRoute', 'ngAnimate', 'ngSanitize','pubnub.angular.service'
]);

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

app.controller('MainCtrl', ['$sce','$http','$scope','$location','$rootScope','$window','Pubnub',function($sce,$http, $scope, $location, $rootScope, $window, Pubnub){
	$scope.go = function ( path ) {
	  $location.path( path );
	};

  $scope.uuid = Math.random(100).toString();
  Pubnub.init({
    publish_key: 'pub-c-ae9aadc9-90d8-4e74-9a27-7d939ba17845',
    subscribe_key: 'sub-c-65f9ff5c-da08-11e7-96a8-ea37cc28f519',
    uuid: $scope.uuid
  });

}]);

app.controller('GameCtrl',['$scope','Pubnub',function($scope,Pubnub){
  $scope.messages = [];
  $scope.presences = [];
  $scope.votes = [];
  $scope.speciesVal = 1;
  $scope.totalInfluences = 0;
  $scope.startGame = function(){
    $scope.rand = Math.floor(Math.random() * 10000) + 1000;
    $scope.channel = 'game-'+$scope.rand;
    $scope.hideStartGame = true;

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
              if($scope.messages.length >=2){
               $scope.runMotion();
              } 
           } else if(m.type=='vote'){
              $scope.votes.push(m);
              // !!!! clear votes[] each turn
              $scope.countInfluence(m.content);
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
      console.log(presenceEvent);
      console.log($scope.presences);
    };

  // endof startGame  
  };

  $scope.turnCounter=0;

  $scope.gameId = "";
  $scope.joinGame = function(){
    console.log('click');
    $scope.joinTrue = true;
    $scope.channel = 'game-'+$scope.gameId;

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
              if($scope.messages.length >=2){
               $scope.runMotion();
              } 
           } else if(m.type=='vote'){
              $scope.votes.push(m);
              // !!!! clear votes[] each turn
              $scope.countInfluence(m.content);
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
      // console.log(presenceEvent);
    };
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
    console.log('run motion')
    $scope.turnCounter += 1;
    $scope.turnSession = true;
  };


  // VOTING
  $scope.influences='';
  $scope.votingStatus = '';
  $scope.sendVote = function(){

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
    console.log($scope.votes);

    if($scope.votes.length<2){
        $scope.votingStatus = false;
    } else if($scope.votes.length==2){
        $scope.votingStatus = true;
    }
  // endof countInfluence()  
  };

  $scope.finishMotion = function(){

    $scope.speciesVal+=1;
    $scope.turnSession = false;

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