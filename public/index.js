$(document).ready(function () {
    let x = document.URL;
    alert(x);
    let oldLength = 0;

    setInterval(function () {

        $.get(x + 'getTransports', function (transports) {
            if (transports.length !== oldLength) {
                $('#table').bootstrapTable('removeAll');
                showTransports();
            }
            oldLength = transports.length;
        });
    }, 500);

    function showTransports() {
        $.get(x + 'getTransports', function (transports) {
            transports.forEach(function (element) {
                let app = `
        <tr>
          <td>` + element[0] + `</td>
          <td>` + fromTimestamp(element[1]/1000) + `</td>
          <td>` + fromTimestamp(element[2]/1000) + `</td>          
        </tr>`;
                $("#tableBody").append(app);

            });
        });
    }




    let nodes = {
        1 :'.deg0',
        2 :'.deg60',
        3 :'.deg120',
        4 :'.deg180',
        5 :'.deg240',
        6 :'.deg300'
    };

    let oldNodeNumber = 0;

    let interval;

    setInterval(function(){

        $.get(x + 'getStateGui', function (currentState) {

            let nodeNumber = currentState.currentState;

            if (nodeNumber !== oldNodeNumber) {
                let nodeCSS = nodes[nodeNumber];
                let oldNodeCSS = nodes[oldNodeNumber];

                let highlightCircle1 = anime({
                    targets: oldNodeCSS,
                    scale: 1,
                    easing: 'easeInOutQuart',
                    autoplay: false
                });
                let highlightCircle2 = anime({
                    targets: nodeCSS,
                    scale: 1.5,
                    easing: 'easeInOutQuart',
                    autoplay: false
                });

                if (oldNodeNumber === 0) {
                    highlightCircle2.play();
                } else {
                    highlightCircle1.play();
                    highlightCircle1.complete = function() { highlightCircle2.play(); };

                }

                clearInterval(interval);
                $(oldNodeCSS).css("border","10px solid #18c1c1");
                let flash = true;
                interval = setInterval(function(){
                    if (flash) {
                        $(nodeCSS).css("border","10px solid #1B91C1");
                        flash = false;
                    } else {
                        $(nodeCSS).css("border","10px solid #18c1c1");
                        flash = true;
                    }
                }, 500);
               /* if (marker) {
                    marker = false;
                    let flash = true;
                    $(nodeCSS).css("z-index","90");

                } else {
                    $(nodeCSS).css("border","10px solid #18c1c1");
                    marker = true;
                }*/
            }

            oldNodeNumber = nodeNumber;

        });
    }, 500);

    setInterval(function(){

       /* $.get(x + 'getSchedule', function (data) {

        });*/

    }, 500);

    let t = +new Date();
    let data1 = [];
    data1.push([t - 1000 * 60 * 15, t - 1000 * 60 * 7]);
    data1.push([t + 1000 * 60 * 3, t + 1000 * 60 * 12]);
    data1.push([t + 1000 * 60 * 21, t + 1000 * 60 * 22]);

    let chart1=new TimeChart([20, 20], data1, "real-time-area");




    function fromTimestamp(strDate) {
        let datum = new Date(strDate * 1000);
        let year = datum.getFullYear();
        let month = datum.getMonth() + 1;
        let day = datum.getDate();
        let hour = datum.getHours();
        let minute = datum.getMinutes();
        let second = datum.getSeconds();
        return day + "/" + month + "/" + year + " " + hour + ":" + minute + ":" + second;
    }



});


class TimeChart {

    constructor(window, data, chartDiv) {
        this.window = window;
        this.data=data;
        this.chartDiv = chartDiv;
        //Set up data for chart
        this.windowSize = 60 * (this.window[0] + this.window[0]);

        this.updateData(data);

        let that=this;
        setInterval(function () {

            let t = +new Date();
            t = t + that.window[1] * 60 * 1000;

            let ind = false;
            for (let j = 0; j < that.data.length; j++) {
                if (t >= that.data[j][0] && t <= that.data[j][1]) {
                    ind = true;
                    break
                }
            }
            if (ind) {
                that.chart.push([{time: t / 1000, y: 1}, {time: t, y: 0}]);
            } else {
                that.chart.push([{time: t / 1000, y: 0}, {time: t, y: 0}]);
            }

            that.chart.data[1].values = that.genNowLine(t);
        }, 1000);

    }

    updateData(data) {
        this.data.push(data);

        let dataSeries=[];
        //Cut data from time series to fit chart data
        let t0 = +new Date();
        let t0min = t0 - this.window[0] * 60 * 1000;

        for (let i = 0; i < this.windowSize; i++) {
            //check if some box has started
            let ind = false;
            for (let j = 0; j < data.length; j++) {
                if (t0min + i * 1000 >= data[j][0] && t0min + i * 1000 <= data[j][1]) {
                    ind = true;
                    break
                }
            }
            if (ind) {
                dataSeries.push({time: (t0min + i * 1000) / 1000, y: 1})
            } else {
                dataSeries.push({time: (t0min + i * 1000) / 1000, y: 0})
            }

        }

        this.chart = $('#' + this.chartDiv + '').epoch({
            type: 'time.line',
            data: [{values: dataSeries}, {values: this.genNowLine(window, t0, 1)}],
            axes: ['bottom'],
            windowSize: this.windowSize,
            historySize: this.windowSize,
            ticks: {time: 60 * 5}
        });

    }

    genNowLine(t) {
        let tBack = t - 60 * this.window[0];
        let tFuture = t + 60 * this.window[1];
        let data = [];
        for (let i = tBack; i < t; i++) {
            data.push({time: i, y: 0});
        }
        let j = 0;
        for (let i = t; i < tFuture; i++) {
            if (j < 1) {
                data.push({time: i, y: 1});
            } else {
                data.push({time: i, y: 0});
            }
            j++;
        }
        return data;
    }

}



