var cards;
var app = angular.module('stagePass', ['ionic', 'ionic.contrib.ui.cards', 'ngLocale', 'ngCookies'])
.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js

  $stateProvider
    // setup an abstract state for the tabs directive 
    .state('home', {
      url: "/",
      templateUrl: "html/home.html"
    })
    .state('user', {
      url: "/user",
      templateUrl: "/html/user.html"
    })
    .state('bandlist', {
      url: "/bandlist",
      templateUrl: "/html/bandlist.html"
    })
    .state('banddetails', {
      url: "/banddetails",
      templateUrl: "/html/banddetails.html"
    })
    .state('band', {
      url: "/band",
      templateUrl: "/html/band.html"
    })
    .state('login', {
      url: "/login",
      templateUrl: "/html/login.html"
    })
     .state('prizes', {
      url: "/prizes",
      templateUrl: "/html/prizes.html"
    })
    .state('userfeed', {
      url: "/userfeed",
      templateUrl: "/html/userfeed.html"
    })
    .state('winnerfeed', {
      url: "/winnerfeed",
      templateUrl: "/html/winnerfeed.html"
    })
  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/');

})
.filter('reverse', function() {
      function toArray(list) {
         var k, out = [];
         if( list ) {
            if( angular.isArray(list) ) {
               out = list;
            }
            else if( typeof(list) === 'object' ) {
               for (k in list) {
                  if (list.hasOwnProperty(k)) { out.push(list[k]); }
               }
            }
         }
         return out;
      }
      return function(items) {
         return toArray(items).slice().reverse();
      };
   })

.directive('noScroll', function($document) {

  return {
    restrict: 'A',
    link: function($scope, $element, $attr) {

      $document.on('touchmove', function(e) {
        e.preventDefault();
      });
    }
  }
});