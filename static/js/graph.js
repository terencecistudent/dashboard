// defer() method takes 2 arguments
// first argument is the format of the data
// second argument is the path to the CSV file
// await() method() takes 1 argument, which is the
// name of a function that we want to call when the data has been downloaded.
queue()
    .defer(d3.csv, "data/Salaries.csv")
    .await(makeGraphs)

/*-------------------------------------------------Make Graphs--------*/
// Create a function with 2 arguments
// First is error
// Second is a variable that the data from the CSV file will be passed into by queue.js.
function makeGraphs(error, salaryData) {
    // Create a crossfilter
    var ndx = crossfilter(salaryData);

    salaryData.forEach(function(d) {
        d.salary = parseInt(d.salary);
        d.yrs_service = parseInt(d["yrs_service"])
    })

    show_discipline_selector(ndx);

    show_percent_that_are_professors(ndx, "Female", "#percentage-of-women-professors");
    show_percent_that_are_professors(ndx, "Male", "#percentage-of-men-professors");

    show_gender_balance(ndx);
    show_average_salaries(ndx);
    show_rank_distribution(ndx);

    show_service_to_salary_correlation(ndx);

    dc.renderAll();
}

// Rendering our selectMenu.
/*-------------------------------------------------Discipline Sector.----------*/

function show_discipline_selector(ndx) {
    dim = ndx.dimension(dc.pluck("discipline"));
    group = dim.group();

    // Needs to be told the <div> to render in.
    dc.selectMenu("#discipline-selector")
        .dimension(dim)
        .group(group);
}


/*-------------------------------------------------- Percentage of Prof.----------*/

function show_percent_that_are_professors(ndx, gender, element) {
    var percentageThatAreProf = ndx.groupAll().reduce(
        // Add item
        function(p, v) {
            // Only interested in incrementing the counter if (v.sex === "Female").
            if(v.sex === gender) {
                p.count++;
                // If rank is Prof we then increment are_prof counter.
                // Gives us totals for the total number of women and the total
                // number of those women that are professors.
                if(v.rank === "Prof") {
                    p.are_prof++;
                }
            }
            return p;
        },

        // Remove item
        function(p, v) {
            // if (v.sex === "Female"), p.count--; reduce the count.
            if(v.sex === gender) {
                p.count--;
                // If (v.rank === "Prof"), p.are_prof--. reduce the are are_prof.
                if(v.rank === "Prof") {
                    P.are_prof++;
                }
            }
            return p;
        },

        // Initialiser
        // Count of the total number of records that we've encountered.
        // Second argument telling us how many of those are our professors.
        function() {
            return {count: 0, are_prof: 0};
        }
    );

    dc.numberDisplay(element)
        // Method that we can use to change the way the number is displayed.
        .formatNumber(d3.format(".2%"))
        .valueAccessor(function (d) {
            if (d.count == 0) {
                return 0;
            } else {
                return (d.are_prof / d.count);
            }
        })
        .group(percentageThatAreProf)
}


/*------------------------------------------------Gender Balance----------*/

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



/*------------------------------------------- Average Salary Chart----------*/

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
            return d.value.average;
        })
        .transitionDuration(500)
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .elasticY(true)
        .xAxisLabel("Gender")
        .yAxis().ticks(4);
}


/*-----------------------------------------------Rank Distribution----------*/

function show_rank_distribution(ndx) {

    // Rank by Gender function.
    function rankByGender(dimension, rank) {
        return dim.group().reduce(
            // Add item
            // Only increment match if the rank of the piece
            // of data we're looking at is professor.
            function (p, v) {
                p.total++;
                if(v.rank == rank) {
                    p.match++;
                }
                return p;
            },

            // Remove item
            // Only decrement the match if the piece of data we're
            // removing is a professor.
            function (p, v) {
                p.total--;
                if(v.rank == rank) {
                    p.match--;
                }
                return p;
            },

            // total = an accumulator, or a count, for the number
            // of rows that we're dealing with.
            // match = the count of how many of those rows are professors.
            function () {
                return {total: 0, match: 0};
            }
        );
    }

    var dim = ndx.dimension(dc.pluck("sex"));
    var profByGender = rankByGender(dim, "Prof");
    var asstProfByGender = rankByGender(dim, "AsstProf");
    var assocProfByGender = rankByGender(dim, "AssocProf");

    console.log(profByGender.all());


    // Plot stacked bar chart to show the data.
    // Use normal bar chart.
    dc.barChart("#rank-distribution")
        .width(400)
        .height(300)
        .dimension(dim)
        // Use stack() method.
        .group(profByGender, "Prof")
        .stack(asstProfByGender, "Asst Prof")
        .stack(assocProfByGender, "Assoc Prof")
        .valueAccessor(function(d) {
            // Total number of men and women that have been found.
            // Match is the number of those that are professors,
            // assistant professors, associate professors.
            if(d.value.total > 0) {
                // For each value we're plotting, find what percentage
                // of the total is the match.
                return (d.value.match / d.value.total) * 100;
            } else {
                return 0;
            }
        })
        .x(d3.scale.ordinal())
        .xUnits(dc.units.ordinal)
        .legend(dc.legend().x(320).y(20).itemHeight(15).gap(5))
        .margins({top: 10, right: 100, bottom: 30, left: 30});
}


/*-----------------------------------------------Service to Salary Correlation------*/

function show_service_to_salary_correlation() {
    var eDim = ndx.dimension(dc.pluck("yrs_service"));

    // yrs_service will be used to plot the x coordinate of the dot.
    // Salary, will be used to plot the y coordinate of the dot,
    // how far up the chart it appears.
    var experienceDim = ndx.dimension(function(d) {
        return [d.yrs_service, d.salary];
    });

    var experienceSalaryGroup = experienceDim.group();

    var minExperience = eDim.bottom(1)[0].yrs_service;
    var maxExperience = eDim.top(1)[0].yrs_service;

    // Scatter Plot
    dc.scatterPlot("#service-salary")
        .width(800)
        .height(400)
        // Linear because 5 years of service is more than 4.
        // Domain of that axis is going to range from the minimum
        // experience to the maximum experience.
        .x(d3.scale.linear().domain([minExperience, maxExperience]))
        .brushOn(false)
        .symbolSize(8)
        .clipPadding(10)
        .xAxisLabel("Years Of Service")
        // title is what will appear if you hover the mouse over a dot.
        // key[1] - relates to that years of service and salary dimension
        // that we created earlier.
        .title(function(d) {
            return "Earned " + d.key[1];
        })
        .dimension(experienceDim)
        .group(experienceSalaryGroup)
        .margins({top: 10, right: 50, bottom: 75, left: 75});
}