function UserCtrl($scope, $rootScope, $cookieStore) {
    $scope.logIn = function() {
        FB.login(function(response) {
            if (response.authResponse) {
                console.log('Welcome!  Fetching your information.... ');
                FB.api('/me', function(response) {
                    $rootScope.currentUser = response;
                    $scope.updateAccepts();
                    $cookieStore.put('spUser', response);
                    window.location.hash = '/winnerfeed';
                    $scope.$apply();
                });
            } else {
                console.log('User cancelled login or did not fully authorize.');
            }
        }, {
            scope: 'email'
        });
    }
    var spUser = $cookieStore.get('spUser');
    if (spUser) {
        $rootScope.currentUser = spUser;
        $scope.updateAccepts();
    }
}

function CardsCtrl($scope, $ionicSwipeCardDelegate, $ionicPopup, $rootScope, $http, $ionicSideMenuDelegate, $ionicModal, $ionicActionSheet, $cookieStore) {
    //initialize the parse api with our app key (not ideal to expose in app code)
    Parse.initialize("OobUE09glmXIvBYk3CsZQfYqiDnjlFgf1VsmtBL7", "Vu5kSIHUT9VExB8Ns00CpiBYttBKH2GwrgfypdSC");
   
    //load up lates submitions to the bands
    $scope.updateCards = function(band) {
            $scope.bandID = band.ids.outside;
            $scope.bandName = band.artist;
            var Cards = Parse.Object.extend("UserRequests");
            var query = new Parse.Query(Cards);
            query.equalTo("response", null);
            query.equalTo("bandId", $scope.bandID);
            query.descending("timestamp");
            query.find({
                success: function(results) {
                    // Do something with the returned Parse.Object values
                    $scope.cards = results;
                    $scope.$apply();
                    $scope.$broadcast('scroll.refreshComplete');
                },
                error: function(error) {
                    //alert("Error: " + error.code + " " + error.message);
                }
            });
            //load the prizes
            $http({url: 'js/prize.json'
            }).success(function(data, status, headers, config) {
                $rootScope.hookups = data;
            });

            //check if this band already has a record of prize allocations
            var Allocations = Parse.Object.extend("BandAllocations");
            var query = new Parse.Query(Allocations);
            query.equalTo("bandID", $scope.bandID);
            query.find({
                success: function(results) {
                    //this band has not logged in yet
                    if (results.length == 0) {
                        //create an allocation record for this band and set its consumptions to 0
                        var AllocatedObj = Parse.Object.extend("BandAllocations");
                        var allocatedObj = new AllocatedObj();
                        allocatedObj.set("bandID", $scope.bandID);
                        //dynamically create a column for each possible proze
                        angular.forEach($scope.hookups, function(hookup, keyhook) {
                            allocatedObj.set(hookup.id, 0);
                            hookup.remaining = hookup.allotment;
                        });
                        allocatedObj.save(null, {
                            success: function(results) {
                                $rootScope.bandAllocations = results;
                            },
                            error: function(recommendationObj, error) {
                                alert('Failed to create new object, with error code: ' + error.description);
                            }
                        });
                    } else {
                    //this band has already logged in and we should update how many items they have remaining
                        $scope.bandAllocations = results;
                        angular.forEach($scope.hookups, function(hookup, keyhook) {
                            hookup.remaining = (hookup.allotment - $scope.bandAllocations[0].attributes[hookup.id])
                        });
                    }
                    $scope.$apply()
                },
                error: function(error) {
                    //alert("Error: " + error.code + " " + error.message);
                }
            });


        }
    
    // An alert dialog
    $scope.showAlert = function(title, message) {
        var alertPopup = $ionicPopup.alert({
            title: title,
            template: message
        });
    };

    $scope.showActions = function() {
        // Show the action sheet
        var hideSheet = $ionicActionSheet.show({
            buttons: [

            ],
            destructiveText: 'Logout',
            titleText: 'Actions',
            cancelText: 'Cancel',
            buttonClicked: function(index) {
                return true;
            },
            destructiveButtonClicked: function(index) {
                //log the user out of the app
                $cookieStore.remove('spUser');
                $rootScope.currentUser = null;
                window.location.hash = '/';
                return true;
            }
        });
    }

    // Load the band submit modal from the given template URL
    $ionicModal.fromTemplateUrl('hook-modal.html', function($ionicModal) {
        $scope.hookModal = $ionicModal;
    }, {
        // Use our scope for the scope of the modal to keep it simple
        scope: $scope,
        // The animation we want to use for the modal entrance
        animation: 'slide-in-up'
    });

    // Load the pass modal from the given template URL
    $ionicModal.fromTemplateUrl('pass-modal.html', function($ionicModal) {
        $scope.passModal = $ionicModal;
    }, {
        // Use our scope for the scope of the modal to keep it simple
        scope: $scope,
        // The animation we want to use for the modal entrance
        animation: 'slide-in-up'
    });

    $scope.takePic = function() {
        $('#fileupload').click();
        
        //bootstrap a listener to the picture upload field to resize and crop it client side 
        //so we arent sending 3MB files over a cell data connection. Posting to a simple PHP script
        //for image renaming and storage on the file server. 
        $('#fileupload').fileupload({
            url: 'upload_file.php',
            // Enable image resizing, except for Android and Opera,
            // which actually support image resizing, but fail to
            // send Blob objects via XHR requests:
            disableImageResize: /Android(?!.*Chrome)|Opera/
                .test(window.navigator && navigator.userAgent),
            imageMaxWidth: 800,
            imageMaxHeight: 800,
            disableImageMetaDataSave: true, // Otherwise orientation is broken on iOS Safari
            imageOrientation: true,
            imageCrop: true, // Force cropped images
            done: function(e, data) {
                console.log(data.result);
                $scope.userImage = data.result;
                $scope.uploadingImage = false;
                $scope.$apply();
            },
            progressall: function() {
                $scope.uploadingImage = true;
                $scope.$apply();
            }
        });
    }
    //remove this card from the list and show the prize modal
    $scope.acceptUser = function(index, card) {
        var index = $scope.cards.indexOf(card)
        $scope.cards.splice(index, 1);     
        $scope.hookModal.show();
        $rootScope.acceptedCard = card;
    };

    //verify the band has this item left to give away and then create a hookup record 
    $scope.selectHooks = function(item) {
        if(item.remaining > 0){
            $scope.hookModal.hide();
            var time = Date.now().toString();
            $scope.acceptedCard.set('response', 'accepeted');
            $scope.acceptedCard.save();
                var HookupObj = Parse.Object.extend("UserHookups");
                var hookupObj = new HookupObj();
                hookupObj.set("bandId", $scope.bandID);
                hookupObj.set("bandName", $scope.bandName);
                hookupObj.set("userID", $scope.acceptedCard.attributes.userID);
                hookupObj.set("userName", $scope.acceptedCard.attributes.name);
                hookupObj.set("hookupName", item.name);
                hookupObj.set("hookupText", item.description);
                hookupObj.set("image", $scope.acceptedCard.attributes.image);
                hookupObj.set("bandImageId", $scope.acceptedCard.attributes.bandImageId);
                hookupObj.set("hookupID", item.id);
                hookupObj.set("timestamp", time);
                hookupObj.save(null, {
                    success: function(results) {

                    },
                    error: function(recommendationObj, error) {
                    //    alert('Failed to create new object, with error code: ' + error.description);
                    }
                });
                $scope.bandAllocations[0].increment(item.id);
                $scope.bandAllocations[0].save();
                item.remaining = (item.remaining - 1);
                $scope.showAlert('Hooked Up: ' + $scope.acceptedCard.attributes.name, "We'll let them know how much you rock!");
        }
    }

    //if the band swipes left, remove this card and mark the request rejected
    $scope.rejectUser = function(index, card) {
        var index = $scope.cards.indexOf(card)
        $scope.cards.splice(index, 1);     
        card.set('response', 'rejected');
        card.save();
        $scope.$apply();
    };
    
    //open the prize modal for the user
    $scope.showPass = function(pass) {
        $scope.selectedPass = pass;
        $scope.passModal.show()
    }
    //once the user has gotten their prize, lets mark it as redeemed
    $scope.redeemPass = function(pass) {
        $scope.selectedPass.set('redeemed', true);
        $scope.selectedPass.save()
        $scope.selectedPass.attributes.redeemed = true;
    }

    //interogate the direction of the swipe and perform the appropriate action
    $scope.cardDestroyed = function(index, card) {
        if (this.swipeCard.positive === true) {
            $scope.acceptUser(index, card);
        } else {
            $scope.rejectUser(index, card);
        }
    };

    //submit the users request by creating a record in our UserRequests table
    $scope.submitRequest = function(message) {
        var time = Date.now().toString();
        var RequestObj = Parse.Object.extend("UserRequests");
        var requestObj = new RequestObj();
        requestObj.set("bandId", $rootScope.selectedBand.ids.outside);
        requestObj.set("bandImageId", $rootScope.selectedBand.imageid);
        requestObj.set("bandName", $rootScope.selectedBand.artist);
        requestObj.set("title", message);
        requestObj.set("userID", $rootScope.currentUser.id);
        requestObj.set("name", $rootScope.currentUser.name);
        if ($scope.userImage) requestObj.set("image", $scope.userImage);
        requestObj.set("timestamp", time);
        requestObj.save(null, {
            success: function(results) {
                $scope.submittedRequest = results;
                window.location.hash = '/userfeed';
                $scope.$apply();
            },
            error: function(recommendationObj, error) {
                alert('Failed to create new object, with error code: ' + error.description);
            }
        });
        $scope.requestSubmitted = true;
        $scope.userImage = null;
    }

    //update view to the submit screen
    $scope.goToSubmit = function() {
        $scope.requestSubmitted = false;
        window.location.hash = '/user';
    }

    //Post to Facebook
    $scope.shareFB = function(pass) {
        FB.ui({
            method: 'feed',
            name: pass.attributes.bandName + ' just hooked ' + $rootScope.currentUser.name + ' up with a ' + pass.attributes.hookupName + ' at Outside Lands!',
            link: 'http://stagepassapp.com',
            picture: 'http://stagepassapp.com/' + pass.attributes.image,
            description: 'StagePass lets you submit your pic to bands at shows and they can hook you up with Stage Passes or other awesome perks.',
            message: '',
            display: 'popup'
        });
    }

    //load this users winning submissions
    $scope.updateAccepts = function() {
        var Accepts = Parse.Object.extend("UserHookups");
        var query = new Parse.Query(Accepts);
        query.equalTo("userID", $rootScope.currentUser.id);
        query.descending("createdAt");
        query.find({
            success: function(results) {
                $scope.usersReponses = results;
                $scope.unredeemed = [];
                angular.forEach($scope.usersReponses, function(response, keyhook) {
                    if (!response.attributes.redeemed){
                        $scope.unredeemed.push(response)
                    }
                });
                $scope.$apply();
                $scope.$broadcast('scroll.refreshComplete');
            },
            error: function(error) {
                //alert("Error: " + error.code + " " + error.message);
            }
        });
    }

    //load the json of all the bands
    $scope.loadBands = function() {
        $http({
            url: 'js/bands.json'
        }).
        success(function(data, status, headers, config) {
            $rootScope.bands = data;
        });
    }
    
    //check if the band name entered exists in the band list and if so, send them to the band view
    $scope.loginBand = function(loggedInBandID) {
        var result = $.grep($scope.bands, function(e) {
            return e.artist.toLowerCase().trim() == loggedInBandID.toLowerCase().trim();
        });
        $scope.bandID = result;
        if (result.length > 0) {
            $rootScope.loggedInBand = true;
            $scope.updateCards(result[0]);
            $scope.loggedInBandOBJ = result[0];
            $scope.$apply();
            window.location.hash = '/band';
        }
    }

    //set the band the user selects
    $scope.setSelectedBand = function(band) {
        $rootScope.selectedBand = band;
    }

    //upon loading the app, lets get all the bands
    $scope.loadBands();
}

function feedCtrl($scope, $rootScope, $http) {

    //get all of the submissions this user has created
    $scope.getUserSubmissions = function() {
        var UserSubs = Parse.Object.extend("UserRequests");
        var query = new Parse.Query(UserSubs);
        query.equalTo("userID", $rootScope.currentUser.id);
        query.descending("createdAt");
        query.find({
            success: function(results) {
                $scope.userSubmissions = results;
                $scope.$apply();
                $scope.$broadcast('scroll.refreshComplete');
            },
            error: function(error) {
                //alert("Error: " + error.code + " " + error.message);
            }
        });
    }
    //get all of the winning submissions
    $scope.updateWinners = function() {
        var Accepts = Parse.Object.extend("UserHookups");
        var query = new Parse.Query(Accepts);
        query.descending("createdAt");
        query.find({
            success: function(results) {
                $scope.winnerstest = results;
                $scope.$apply();
                $scope.$broadcast('scroll.refreshComplete');
            },
            error: function(error) {
                //alert("Error: " + error.code + " " + error.message);
            }
        });
    }
    //if the user is logged in, load up all of the feeds
    if ($rootScope.currentUser){    
        $scope.getUserSubmissions();
        $scope.updateWinners();
        $scope.updateAccepts();
    }
}