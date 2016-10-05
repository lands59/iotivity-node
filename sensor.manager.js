var mraa = require('mraa');
var temphumidBus = new mraa.I2c(6);
temphumidBus.address(0x44);
 
var brightBus = new mraa.I2c(6);
brightBus.address(0x23);    
 
var motionBus = new mraa.I2c(6);
motionBus.address(0x1);
 
var index = {
    TEMPHUMID : 0x00,
    BRIGHTNESS : 0x01,
    MOTION : 0x02
}; 

var type = {
    TEMPHUMID : 'TEMPHUMID',
    BRIGHTNESS : 'BRIGHTNESS',
    MOTION : 'MOTION'
};

var desc = {
	TEMPHUMID : 'Current sensed value for Humidity',
	BRIGHTNESS : 'Current sensed value for Brightness',
	MOTION : 'It describes whether motion has been sensed or not'
}

var interval = {
    TEMPHUMID : 3000,
    BRIGHTNESS : 3000,
    MOTION : 1000
}; 

exports.type = type; 
var connect = [ false, false, false ];
var lastMotion = false;



exports.SensorManager = function() { 
    this._interval = [ interval.TEMPHUMID, interval.BRIGHTNESS, interval.MOTION ];
    console.log(this._interval);
    this._intv = [ 3 ];
    this._callback = [
	//index 0, Temperature
            function(onConnected, onRecieved) {
                temphumidBus.writeByte(0);
                
                setTimeout(function(onConnected, onRecieved) {
                    var connected = false;
                    var humid;
                    var temp;

                    try {
                        var data = temphumidBus.read(4);     
                         humid = (((data[0] << 8) + data[1]) * 100) / (2 << 14 - 1);
                         temp = (((((data[2] << 8) + data[3]) / 4) * 165) / (2 << 14 - 1)) - 40; 
                         connected = true;
                    
                    } catch (error) {
                        connected = false;
                    }

                    if (connect[index[type.TEMPHUMID]] !== connected
                            && onConnected !== null) {
                        connect[index[type.TEMPHUMID]] = connected;
                        onConnected(type.TEMPHUMID, connected, desc);
                    }

                    if (connected == true && onRecieved !== null) {
                        onRecieved(type.TEMPHUMID, [ humid, temp ], desc.TEMPHUMID);
                    }
                }, 500, onConnected, onRecieved);
            },

	//index 1, Brightness
            function(onConnected, onRecieved) {
                var connected = false;
                var brightness = 0;

                try {
                    var data = brightBus.readBytesReg(0x10, 2); 
                     brightness = ((data[0] << 8) + data[1]) / 1.2;
                    connected = true;
                } catch (error) {
                    connected = false;
                }

                if (connect[index[type.BRIGHTNESS]] !== connected
                        && onConnected !== null) {
                    connect[index[type.BRIGHTNESS]] = connected;
                    onConnected(type.BRIGHTNESS, connected, desc);
                }

                if (connected == true && onRecieved !== null) {
                    onRecieved(type.BRIGHTNESS, brightness, desc.BRIGHTNESS);
                }
            },

	//index 2, Motion
            function(onConnected, onRecieved) {
                var connected = false;
                var motion = false;
                try {

                    var data = motionBus.read(1); 
                     motion = data[0] == 0x07? true : false;
                    connected = true;

                } catch (error) {
                    connected = false;
                }

                if (connect[index[type.MOTION]] !== connected
                        && onConnected !== null) {
                    connect[index[type.MOTION]] = connected;
                    onConnected(type.MOTION, connected, desc);
                }

                if (connected == true &&onRecieved !== null) {
                    if(motion !== lastMotion)
                       onRecieved(type.MOTION, motion, desc.MOTION);
                    lastMotion = motion;
                }
            } ]; 

};
 

exports.SensorManager.prototype = { 

    start : function(onConnected, onRecieved) {

        console.log("start");
        // this._intv[0] = setInterval(this._callback[0], 1000, callback);
        this._onConnected = onConnected;
        for ( var i in index) {
            console.log('\tStart observing data : ' + type[i] + ' ' + interval[i] + 'ms');
            this._intv[i] = setInterval(this._callback[index[i]], interval[i],
                    onConnected, onRecieved);
        }
    },

    stop : function() {
        console.log("stop");
        for ( var i in index) {
            console.log('\tStop observing data : ' + type[i]);
            clearInterval(this._intv[index[i]]);
            if (connect[index[i]])
                this._onConnected(type[i], false);
        }
        connected = [ false, false, false ];
        lastMotion = false;
    },
}
