// defer() method takes 2 arguments
// first argument is the format of the data
// second argument is the path to the CSV file
// await() method() takes 1 argument, which is the
// name of a function that we want to call when the data has been downloaded.
queue()
    .defer(d3.csv, "data/Salaries.csv")
    .await(makeGraphs)

// Create a function with 2 arguments
// First is error
// Second is a variable that the data from the CSV file will be passed into by queue.js.
function makeGraphs(error, salaryData) {
    // Create a crossfilter
    var ndx = crossfilter(salaryData);

    salaryData.forEach(function(d) {
        d.salary = parseInt(d.salary);
    })

    show_discipline_selector(ndx);
    show_gender_balance(ndx);
    show_average_salaries(ndx);

    dc.renderAll();
}

// Rendering our selectMenu.
function show_discipline_selector(ndx) {
    dim = ndx.dimension(dc.pluck("discipline"));
    group = dim.group();

    // Needs to be told the <div> to render in.
    dc.selectMenu("#discipline-selector")
        .dimension(dim)
        .group(group);
}

// Takes one argument - ndx
function show_gender_balance(ndx) {
    var dim = ndx.dimension(dc.pluck("sex"));
    // Count the rows in the data that have each of the two genders.
    var group = dim.group();

    // Using DC (Dimensional Charting).
    // CSS selector # used to ID DIV.
    dc.barChart("#gender-balance")
        .width(400)
        .height(300)
        .margins({top: 10, right: 50, bottom:30, left: 50})
        .dimension(dim)
        .group(group)
        // Will indicate how quickly the chart animates when we filter.
        .transitionDuration(500)
        // Using ordinal scale as the dimension consists of the words male and female.
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .xAxisLabel("Gender")
        .yAxis().ticks(20);
}


// Average Salary Chart
function show_average_salaries(ndx) {
    var dim = ndx.dimension(dc.pluck("sex"));

    // Add item takes 2 arguments, p and v.
    // P is an accumulator that keeps track of the total, the count, and the average.
    // V represents each of the data items that we're adding or removing.
    function add_item(p, v) {
        p.count++;
        p.total += v.salary;
        p.average = p.total / p.count;
        return p;
    }

    function remove_item(p, v) {
        p.count--;
        if(p.count == 0) {
            p.total = 0;
            p.average = 0;
        } else {
            p.total -= v.salary;
            p.average = p.total / p.count;
        }
        return p;
    }

    function initialise() {
        return {count: 0, total: 0, average: 0};
    }

    var averageSalaryByGender = dim.group().reduce(add_item, remove_item, initialise);

    // Average salary DC barchart.
    dc.barChart("#average-salary")
        .width(400)
        .height(300)
        .margins({top: 10, right: 50, bottom: 30, left: 50})
        .dimension(dim)
        .group(averageSalaryByGender)
        .valueAccessor(function(d){
            return d.value.average.toFixed(2);
        })
        .transitionDuration(500)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .elasticY(true)
        .xAxisLabel("Gender")
        .yAxis().ticks(4);
}