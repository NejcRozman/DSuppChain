class TimeChart {

    constructor(window, data, chartDiv) {
        this.window = window;
        this.chartDiv = chartDiv;
        //Set up data for chart
        this.windowSize = 60 * (this.window[0] + this.window[0]);

        this.updateData(data);

        setInterval(function () {
            let t = +new Date();
            t = t + this.window[1] * 60 * 1000;

            let ind = false;
            for (let j = 0; j < this.data.length; j++) {
                if (t >= this.data[j][0] && t <= this.data[j][1]) {
                    ind = true;
                    break
                }
            }
            if (ind) {
                this.chart.push([{time: t / 1000, y: 1}, {time: t, y: 0}]);
            } else {
                this.chart.push([{time: t / 1000, y: 0}, {time: t, y: 0}]);
            }

            this.chart.data[1].values = this.genNowLine(t);
        }, 1000);

    }

    updateData(data) {
        this.data = data;
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
            data: [{values: dataSeries}, {values: genNowLine(window, t0, 1)}],
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