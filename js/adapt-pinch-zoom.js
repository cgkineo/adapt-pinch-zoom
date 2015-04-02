/*
* adapt-contrib-pinch-zoom
* License - http://github.com/adaptlearning/adapt_framework/LICENSE
* Maintainers - Stuart Nicholls <stuart@stuartnicholls.com>, Mohammed Salamat Ali <Mohammed.SalamatAli@kineo.com>
*/
define(function(require) {

    var Adapt = require('coreJS/adapt');
    var Backbone = require('backbone');
    var Hammer = require("extensions/adapt-pinch-zoom/js/hammer.min");


    var PinchZoomManager = {

        gestureManagers : null,


        //Default settings overridden once initalised with course.json '_pinchZoom' extension hash
        config : {
            minScale : 1, // minimum amount something can be scaled
            maxScale: 4, // max amount something can be scaled
            keepWithinBounds : true, //prevent element being dragged out of it parent boundaries
            resetOnTap : true,
            selectors:[], //additional selectors
            defaultSelector: '.adapt-pinch-zoom'                    
        },


        initialise : function(){
           
            this.gestureManagers = [];
            
            _.extend(this.config, Adapt.course.get('_pinchZoom') || {});
            this.config.selectors.push(this.config.defaultSelector);
            this.config.selectors = this.config.selectors.join(",");
        },

        findTargets : function($el){

            this.gestureManagers = [];
            var targets = $el.find(this.config.selectors);
           
            for(var i=0; target=targets[i]; i++){
                this.createGestureManager(target);
            }            
        },


        // adds a Hammer manager to each jquery target - uses jquery.data() api to store target details
        createGestureManager : function(target){
            
            var $target = $(target);

            if(target.tagName === 'IMG' && !$target.prop('complete')){
                $target.on('load', _.bind(function(event){             
                    this.createGestureManager(event.currentTarget);
                }, this));
                return;
            }


            var manager = new Hammer.Manager(target);

            manager.add(new Hammer.Pan({threshold:0, pointers:0}));            
            manager.add( new Hammer.Pinch({threshold:0})).recognizeWith(manager.get('pan'));

            manager.on('pinchstart',  _.bind(this.onPinchStart, this));  
            manager.on('pinchmove',  _.bind(this.onPinchMove, this));            
            manager.on('panstart', _.bind(this.onPanStart, this));
            manager.on('panmove', _.bind(this.onPanMove, this));

            if(this.config.resetOnTap){
                manager.add(new Hammer.Tap()); 
                manager.on('tap', _.bind(this.onTap, this))
            }
            

            var width = $target.width();
            var height = $target.height();

            var pinchData = {
                scale:1,
                originScale : 1,
                originalWidth:width,
                originalHeight: height,
                originX: 0,
                originY: 0,
                translateX: 0,
                translateY: 0,
                hasInteracted: false
            };

            $target.data('pinch', pinchData);   
            $target.wrap('<div class="adapt-pinch-zoom-viewport not-interacted"></div>');      

            this.gestureManagers.push(manager);
        },

        clearGestureManagers : function(){

            for(var i=0; manager=this.gestureManagers[i]; i++){
                manager.off('pinch panstart panmove');
            }  
        },

        onTap : function(event){
            
            var $target = $(event.target);
            var pinchData = $target.data('pinch');

            pinchData.scale = 1;
            pinchData.translateX = 0;
            pinchData.translateY = 0;            

            $target.data('pinch', pinchData);
            this.updateElement($target);
        },


        onPinchStart : function(event){

            var $target = $(event.target);
            var pinchData = $target.data('pinch');
            pinchData.originScale = pinchData.scale;            
            
            $target.data('pinch', pinchData);               
        },


        onPinchMove : function(event){

            var $target = $(event.target);
            var pinchData = $target.data('pinch');
            pinchData.scale =  pinchData.originScale * event.scale;
            $target.data('pinch', pinchData);            

            pinchData.scale = Math.min(pinchData.scale, this.config.maxScale);
            pinchData.scale = Math.max(pinchData.scale, this.config.minScale);
            
            this.updateElement($target);                
        },


        //updates current x/y position
        onPanStart : function(event){

            var $target = $(event.target);
            var pinchData = $target.data('pinch');
            
            pinchData.originX = pinchData.translateX;
            pinchData.originY = pinchData.translateY;

            $target.data('pinch', pinchData);
        },

        onPanMove : function(event){
       
            var $target = $(event.target);
            var pinchData = $target.data('pinch');

            pinchData.translateX = pinchData.originX + event.deltaX;
            pinchData.translateY = pinchData.originY + event.deltaY;

            $target.data('pinch', pinchData);  

            if(this.config.keepWithinBounds){
                this.calculateBounds($target);
            }            
            
            this.updateElement($target);                             
        },  


        calculateBounds : function($target){

            var pinchData = $target.data('pinch');

            var deltaX = ((pinchData.originalWidth * pinchData.scale) - pinchData.originalWidth)/2;
            var deltaY = ((pinchData.originalHeight * pinchData.scale) - pinchData.originalHeight)/2;

            pinchData.translateX = Math.min( Math.max(pinchData.translateX, -deltaX), deltaX);
            pinchData.translateY = Math.min( Math.max(pinchData.translateY, -deltaY), deltaY);

            $target.data('pinch', pinchData);                        
        },

        
        updateElement : function($target){

            var pinchData = $target.data('pinch');  
            if(!pinchData.hasInteracted){          
            
                pinchData.hasInteracted = true;
                $target.data('pinch', pinchData);
                $target.parent('.adapt-pinch-zoom-viewport').removeClass('not-interacted');
            }

            $target.css({
                transform: 'translateX('+pinchData.translateX+'px) translateY('+pinchData.translateY+'px) scale('+pinchData.scale+')'                               
            });       
        }      

    };

   

    Adapt.on('app:dataReady', function() {
        
        if(Modernizr.touch){        
            PinchZoomManager.initialise();
        }
    });    

    Adapt.on('pageView:ready', function(view) {
    
        if(Modernizr.touch){
            PinchZoomManager.findTargets(view.$el);
        }
    });

    Adapt.on('popup:opened', function($el){ 
        if(Modernizr.touch){          
            PinchZoomManager.findTargets($el);    
        }
    });

    Adapt.on('remove', function(view) {
        if(Modernizr.touch){ 
            PinchZoomManager.clearGestureManagers();
        }
    });    



    return PinchZoomManager;
});






