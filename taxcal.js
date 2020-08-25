
//var loading;
var params = {
  year: 2011,     // 1984 - 2015
  type: 0,        // 0 - 3
  sortdir: false,
  income: 50000,
  filing: 0,      // 0 - 4
  group: ["agency", "bureau", "function", "subfunction"],
  showChange: false,
  showExtra: false
};

var months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
var workWeek = {1:true, 2:true, 3:true, 4:true, 5:true};

window.onload = function() { 
  
  var yearmenu = d3.select("#yearmenu ul");
  yearmenu.selectAll("li.year")
      .data(d3.range(1984, 2016))
    .enter().append("li")
      .attr("class", "year")
    .append("a").attr("href", "#")
      .attr("class", function(d) { return d == params.year ? "selected" : ""; })
      .text(function(d) { return "'"+d3.format("02d")(d%100); })
      .on("click", function(d) { yearmenu.selectAll("li.year").select("a").attr("class", ""); d3.select(this).attr("class", "selected"); params.year = parseInt(d); loadItUp(); });
  var statusmenu = d3.select("#statusmenu ul");
  statusmenu.selectAll("li.status")
      .data(["[single]", "[married filing jointly]", "[married filing separately]", "[head of household]"])
    .enter().append("li")
      .attr("class", "status")
    .append("a").attr("href", "#")
      .attr("class", function(d, i) { return i == params.filing ? "selected" : ""; })
      .text(function(d) { return d; })
      .on("click", function(d, i) { statusmenu.selectAll("li.status").select("a").attr("class", ""); d3.select(this).attr("class", "selected"); params.filing = i; loadItUp(); });
  d3.select("#income input")
    .on("keypress", function() {if (d3.event.keyCode == 13) { params.income = parseInt(this.value); loadItUp(); }})
    .on("blur", function() { params.income = parseInt(this.value); loadItUp(); });
  var workweekmenu = d3.select("#workweekmenu ul");
  workweekmenu.selectAll("li.day")
    .data(["[sun]", "[mon]", "[tue]", "[wed]", "[thu]", "[fri]", "[sat]"])
    .enter().append("li")
      .attr("class", "day")
    .append("a").attr("href", "#")
      .attr("class", function(d, i) { return workWeek[i] ? "selected" : ""; })
      .text(function(d) { return d; })
      .on("click", function(d, i) {
        var day = d3.select(this);
        if (workWeek[i]) {
          delete workWeek[i];
          day.attr("class", "");
        } else {
          workWeek[i] = true;
          day.attr("class", "selected");
        }
        loadItUp();
      });
  loadItUp();
}

function loadItUp() {
  var base = "http://www.whatwepayfor.com/api/";  
  var type  = "getBudgetAggregate/";
  var call = "?year=" + params.year +
         "&type=" + params.type +
         "&sortdir=" + (params.sortdir * 1) +
         "&income=" + params.income +
         "&filing=" + params.filing +
         "&group=" + params.group[2]+
         "&showChange=" + (params.showChange * 1) +
         "&showExtra="  + (params.showExtra * 1);
  
  var api  = base + type + call;
  
  Ajax.get(api, success)
};

var success = function(data) {
  var xml = data;
  if(typeof data == 'string') {
    xml = stringToXml(data);
  }
  var items = xml.getElementsByTagName('item');
  
  d3.selectAll("svg").remove();
  
  var vis = drawCalendar(params.year);
  colorCalendar(vis, items);
};

var fill = d3.scale.category10();

function colorCalendar(vis, data) {
  var cal = calendar.dates(params.year);
  var workDays = 0;
  for (var i = 0; i < cal.length; ++i) {
    if (workWeek[cal[i].day]) {
      workDays++;
    }
  }
  
  var cumulativeDays = [];
  var category = [];
  var costs = [];
  var totalTaxes = 0;
  for(var i = 0; i < data.length; ++i) {
    var item = data.item(i);
    var cost = parseFloat(item.getAttribute('mycosti'));
    totalTaxes += cost;
    if (cost > 0) {
      costs.push(cost);
      var curDays = workDays*cost/params.income;
      cumulativeDays.push(i == 0 ? curDays : cumulativeDays[i-1]+curDays);    
      category.push(item.getAttribute('dimensionName'));
    }
  }
  cumulativeDays.push(workDays);
  category.push("providing for yourself, after also paying state and local taxes")
  costs.push(params.income - totalTaxes)
  for (var i = 0; i < cumulativeDays.length; ++i) {
    cumulativeDays[i] = Math.round(cumulativeDays[i]);
  }
  
  var curCategory = 0;
  var curWorkDay = 1;
  var startDate = [cal[0].Date];
  var endDate = [cal[0].Date];
  for (var i = 0; i < cal.length; ++i) {
    if (workWeek[cal[i].day]) {
      data[cal[i].Date] = curCategory;
      if (startDate[curCategory] == false) {
        startDate[curCategory] = cal[i].Date;
      }
      endDate[curCategory] = cal[i].Date;
      curWorkDay++;
      while (curCategory < cumulativeDays.length && curWorkDay > cumulativeDays[curCategory]) {
        curCategory++;
        startDate.push(false);
        endDate.push(false);
      }
    } else {
      data[cal[i].Date] = -1;
    }
  }
  
  function categoryName(i) {
    return i >= 0 && i < category.length ? category[i] : "";
  }
  
  function fade(opacity) {
    return function(g) {
      vis.selectAll("rect.day")
        .filter(function(d) {
          //return categoryName(data[d.Date]) === categoryName(data[g.Date]);
                  return data[d.Date] === data[g.Date];
        })
      .transition()
        .attr("opacity", opacity);
    };
  }
  
  function dateFormat(d) {
    var s = d.split("-");
    var month = parseInt(s[1])-1;
    var day = parseInt(s[2]);
    return months[month]+" "+day;
  }
  
  function over(g) {
    if (data[g.Date] < 0) {
      d3.select("#message")
        .text("");
      vis.selectAll("path.arrow")
        .transition().duration(100)
        .style("stroke", "rgba(0,0,0,0)");
      return;
    }

    var gcat = data[g.Date];
    vis.selectAll("rect.day")
      .filter(function(d) {
        //return categoryName(data[d.Date]) === categoryName(data[g.Date]);
                return data[d.Date] === gcat;
      })
    .transition()
      .attr("opacity", 1);
    //var x = d3.svg.mouse(vis.node())[0];
    var x = parseFloat(d3.select(this).attr("x"))+(0.5*z);
    var c = fill(categoryName(data[g.Date]));
    var y = parseFloat(h)+40;
    vis.selectAll("path.arrow")
      .transition().duration(100)
    .attr("d", "M" + 0 + "," + y
              + "H" + (x-20)
              + "C" + x + "," + y + " " + x + "," + (y-20) + " " + x + "," + (y-10)
              + "C" + x + "," + (y-20) + " " + x + "," + y + " " + (x+20) + "," + y
              + "H" + w)
    .style("stroke", c);
    
    var i = data[g.Date];
    
    var d = i == 0 ? cumulativeDays[i] : cumulativeDays[i] - cumulativeDays[i-1];
    var start = dateFormat(startDate[i]);
    var end = dateFormat(endDate[i]);
    var m;
    if (d > 1) {
      m = "In the " + d + " working days from " + start + " to " + end + ", ";
    } else {
      m = "On " + start + ", ";
    }
    m += "your income would go toward " + categoryName(i) + " ($" + d3.format(",.2f")(costs[i]) + ", or " + d3.format(".1f")(costs[i]/params.income*100) + "%).";

    d3.select("#message")
      .text(m);
  }
    
  vis.selectAll("rect.day")
  //.transition().duration(1000)
  .style("fill", function(d) { return data[d.Date] < 0 ? "#ffffff" : fill(categoryName(data[d.Date])); })
  
  vis.selectAll("rect.day")
  .attr("opacity", 0.5)
  .on("mouseover", over)
  .on("mouseout", fade(0.5))
  .append("svg:title")
  .text(function(d) { return categoryName(data[d.Date]); });
}

var w, pw, z, ph, h;

function drawCalendar(year) {
  w = 17*54+50+2;
  pw = 50;
  //z = ~~((w - pw) / 53);
  z = 17;
  ph = z >> 1;
  h = z * 7;

  var vis = d3.select("#chart")
    .selectAll("svg")
      //.data(d3.range(1990, 2011))
      .data([year])
    .enter().append("svg:svg")
      .attr("width", w)
      .attr("height", h + ph * 2 + 50)
      .attr("class", "RdGy")
    .append("svg:g")
      .attr("transform", "translate(" + pw + "," + ph + ")");
  /*
  vis.append("svg:text")
      .attr("transform", "translate(-6," + h / 2 + ")rotate(-90)")
      .attr("text-anchor", "middle")
      .text(function(d) { return d; });
  */
  var days = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  vis.selectAll("text.day")
  .data(days)
  .enter().append("svg:text")
  .attr("transform", function(d, i) { return "translate(-8," + (i+0.75)*z + ")"; } )
  .attr("text-anchor", "end")
  .text(function(d) { return d; });
  
  vis.selectAll("rect.day")
      .data(calendar.dates)
    .enter().append("svg:rect")
      .attr("x", function(d) { return d.week * z; })
      .attr("y", function(d) { return d.day * z; })
      .attr("class", "day")
      .attr("fill", "#fff")
      .attr("width", z)
      .attr("height", z);
  
  vis.selectAll("path.month")
      .data(calendar.months)
    .enter().append("svg:path")
      .attr("class", "month")
      .attr("d", function(d) {
        return "M" + (d.firstWeek + 1) * z + "," + d.firstDay * z
            + "H" + d.firstWeek * z
            + "V" + 7 * z
            + "H" + d.lastWeek * z
            + "V" + (d.lastDay + 1) * z
            + "H" + (d.lastWeek + 1) * z
            + "V" + 0
            + "H" + (d.firstWeek + 1) * z
            + "Z";
      });
  
  vis.selectAll("text.monthname")
      .data(calendar.months)
    .enter().append("svg:text")
      .attr("class", "monthname")
      .attr("x", function(d) { return 0.5*(d.firstWeek + d.lastWeek)*z; })
      .attr("y", h+15)
      .attr("text-anchor", "middle")
    .text(function(d, i) { return months[i].toLowerCase(); });
  
  vis.append("svg:path")
    .attr("class", "arrow");
  
  return vis;
}
