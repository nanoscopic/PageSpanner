var PageSpanner = Class.create();
PageSpanner.prototype = {
  curpage: 0,
  table: 0,
  bid: 0,
  initialize: function( tables ) {
    this.curpage = new Page();
    this.tables = tables;
  },
  add_items: function( r ) {
    for( var i=0;i<r.length;i++ ) {
      var part = r[ i ];
      var n = part[0];
      var v = part[1];
      if( n == 0 ) {
        this.add_html( v );
      }
      if( n == 1 ) { // named
        var type = v[0];
        if( type == 'table' ) {
          var tname = v[1];
          this.add_table( this.tables[ tname ] );
        }
        if( type == 'tableid' ) {
          var insertid = v[1];
          var tname = v[2];
          this.add_table_in_id( insertid, this.tables[ tname ] );
        }
        if( type == 'chart' ) {
          var cname = v[1];
          var tb = this.tables[ cname ];
          var xys = this.findxys( tb );
         if( xys ) this.add_graph( xys, tb['chart'] || 0, cname, 0 );
        }
        if( type == 'chartid' ) {
          var insertid = v[1];
          var cname = v[2];
          var tb = this.tables[ cname ];
          var xys = this.findxys( tb );
          if( xys ) this.add_graph( xys, tb['chart'] || 0, cname, insertid );
        }
      }
    }
    this.curpage.finalize();
  },
  findxys: function( tb ) {
    if( tb.xys ) return tb.xys;
    if( tb.groups ) {
      for( var i=0;i<tb.groups.length;i++ ) {
        var group = tb.groups[i];
        if( group.xys ) return group.xys;
        var sets = group.sets;
        for( var j=0;j<sets.length;j++ ) {
          var set = sets[j];
          var x = this.findxys( set );
          if( x ) return x;
        }
      }
    }
  },
  add_html: function( html ) {
    var div = _newdiv();
    div.innerHTML = html;
    while( div.firstChild ) {
      var child = div.firstChild;
      this.curpage.append( child );
      if( this.curpage.is_full() ) {
        this.curpage.finalize();
        this.curpage = new Page();
        this.curpage.append( child );
      }
    }
  },
  /*add_table: function( thtml ) {
    var div = _newdiv();
    var tbody = this.add_empty_table( curpage );
    
    div.innerHTML = thtml;
    var trs = div.getElementsByTagName( 'TR' );
    var x=2;
    while( trs.length ) { // appending the tr elsewhere removes it
      var tr = trs[0];
      _append( tbody, tr );
      if( this.curpage.is_full() ) {
        //tbody.removeChild( tr ); // in theory we can skip this
        this.curpage.finalize();
        this.curpage = new Page();
        tbody = this.add_empty_table();
        _append( tbody, tr );
      }
    }
  },*/
  addTr: function( tr, callback ) {
    _append( this.curtbody, tr );
    if( this.curpage.is_full() ) {
      //tbody.removeChild( tr ); // in theory we can skip this
      this.curpage.finalize();
      this.curpage = new Page();
      this.curtbody = this.add_empty_table();
      callback();
      _append( this.curtbody, tr );
    }
  },
  add_table_in_id: function( insertid, thash ) {
    this.curtbody = this.add_empty_table( insertid );
    var tob = new TableSys( thash, this );
    tob.render( this );
  },
  add_table: function( thash ) {
    this.curtbody = this.add_empty_table();
    var tob = new TableSys( thash, this );
    tob.render( this );
  },
  add_graph: function( xys, inf, tbname, insertid ) {
    var div = _newdiv();
    var sp;
    if( insertid ) {
      sp = _getel(insertid);
      _append( sp, div );
    }
    else {
      this.curpage.append( div );
    }
    
    _append( sp, _newbr() );
    
    this.bid++;
    div.className = 'ct-chart';
    div.id = 'bid' + this.bid;
    var ref = '.ct-chart#bid' + this.bid;
    var xs = [];
    var ys = [];
    var y1 = [], y2 = [];
    var multiy = 0;
    for( var xyi in xys ) {
      var xy = xys[ xyi ];
      var x = xy.x;
      var y = xy.y;
      xs.push( x );
      if( typeof( y ) != 'object' ) {
        ys.push( y );
      }
      else {
        y1.push( y[0] );
        y2.push( y[1] );
        multiy = 1;
      }
    }
    var series = [ ys ];
    
    var ops = {
      width: 600,
      height: 300
    };
    if( multiy ) {
      series = [ y1, y2 ];
      ops.stackBars = 1;
    }
    
    var chart;
    
    var type = 'bar';
    if( inf ) {
      type = inf.type;
      if( inf.options ) {
        var addops = inf.options;
        if( addops.labelInterpolationFnc ) {
          var lif;
          eval( 'lif = ' + addops.labelInterpolationFnc );
          addops.labelInterpolationFnc = lif;
        }
        if( addops.axisX ) { addops.axisX.offset = addops.axisX.offset*1; }
        if( addops.axisY ) { addops.axisY.offset = addops.axisY.offset*1; }
        fix_numbers( inf.options );
        _mux( ops, inf.options );
      }
      if( inf.jitterLabels ) {
        for( var i in xs ) {
          if( i%2 == 1 ) {
            xs[ i ] = "\n" + xs[ i ];
          }
        }
      }
    }
    if( type == 'bar' ) {
      chart = new Chartist.Bar( ref, {
          labels: xs,
          series: series
      }, ops );
    }
    if( type == 'pie' ) {
      series = series[0];
      for( var i in series ) {
        series[i] = series[i] * 1;
      }
      chart = new Chartist.Pie( ref, {
          //labels: xs,
          series: series
      }, ops );
    }
    if( inf ) {
      if( inf.onDraw ) {
        var ofunc;
        eval( 'var ofunc = ' + inf.onDraw );
        chart.on('draw', ofunc );
      }
    }
    
    return div;
  },
  add_empty_table: function( insertid ) {
    var tb = _newtable();
    tb.table.cellPadding = 4;
    tb.table.cellSpacing = 0;
    tb.table.border = '1';
    var tbody = tb.tbody;
    //_append( this.curpage, tb.table );
    if( insertid ) {
      var el = _getel( insertid );
      _append( el, tb.table );
    }
    else this.curpage.append( tb.table );
    return tb.tbody;
  },
  newTb: function() {
    if( !this.curtbody.firstChild ) return 0;
    var bod = this.add_empty_table();
    this.curtbody = bod;
    return bod;
  }
};
var TableSys = Class.create();
TableSys.prototype = {
  def: 0,
  spanner: 0,
  levelStack: 0,
  initialize: function( def, spanner ) {
    this.def = def;
    this.spanner = spanner;
    this.levelStack = [];
  },
  render: function() {
    var root = new TableLevel( this.def, this.spanner, this, 0 );
    this.pushLevel( root );
    root.render();
    this.popLevel();
  },
  addTr: function( tr, callback ) {
    this.spanner.addTr( tr, callback );
  },
  pushLevel: function( lev ) {
    this.levelStack.push( lev );
  },
  popLevel: function( lev ) {
    return this.levelStack.pop();
  },
  getLevel: function( i ) {
    return this.levelStack[ i ];
  },
  newTb: function() {
    return this.spanner.newTb();
  }
};

var TableLevel = Class.create();
TableLevel.prototype = { 
  def: 0,
  spanner: 0,
  sys: 0,
  levelId: 0,
  shownHeaders: 0,
  initialize: function( def, spanner, sys, levelId ) {
    this.def = def;
    this.spanner = spanner;
    this.sys = sys;
    this.levelId = levelId;
    this.shownHeaders = [];
  },
  render: function() {
    if( this.def.header ) this.renderHeaders( this.def.header );
    if( this.def.detail ) this.renderDetail( this.def.detail );
    if( this.def.groups ) this.renderGroups( this.def.groups );
  },
  renderDetail: function( headers ) {
    for( var i in headers ) {
      var header = headers[ i ];
      var tr = _newel('tr');
      tr.innerHTML = header;
      var self = this;
      this.sys.addTr( tr, function() {
          var showLevel;
          if( self.levelId > 0 ) {
            var maxShow = self.levelId - 1;
            for( var showLevel = 0; showLevel <= maxShow; showLevel++ ) {
              var above = self.sys.getLevel( showLevel );
              if( above.def.header ) above.renderHeaders( above.def.header );
            }
          }
      } );
    }
  },
  killHeaders: function() {
    for( var i=0;i<this.shownHeaders.length;i++ ) {
      var h = this.shownHeaders[ i ];
      h.parentNode.removeChild( h );
    }
    this.shownHeaders = [];
  },
  renderHeaders: function( headers ) {
    for( var i in headers ) {
      var header = headers[ i ];
      var tr = _newel('tr');
      //var levelEmpty = (this.shownHeaders.length == 0);
      this.shownHeaders.push( tr );
      tr.innerHTML = header;
      var self = this;
      //var doKill = ( i == 0 ) ? 1 : 0;
      
      this.sys.addTr( tr, function( levelEmpty ) {
          var showLevel;
          if( self.levelId > 0 ) {
            var maxShow = self.levelId - 1;
            /*for( var showLevel = maxShow; showLevel >= 0; showLevel-- ) {
              var showLevel = maxShow;
              var above = self.sys.getLevel( showLevel );
              if( doKill ) { above.killHeaders(); doKill = 0; }
            }*/
            
            for( var showLevel = 0; showLevel <= maxShow; showLevel++ ) {
              var above = self.sys.getLevel( showLevel );
              if( above.def.header ) above.renderHeaders( above.def.header );
            }
          }
      } );
    }
  },
  renderGroups: function( groups ) {
    for( var i in groups ) {
      var group = groups[i];
      var sets = group.sets;
      for( var j in sets ) {
        var set = sets[j];
        if( set.use_new_table ) this.sys.newTb();
        var level = new TableLevel( set, this.spanner, this.sys, this.levelId + 1 );
        this.sys.pushLevel( level );
        level.render();
        this.sys.popLevel();
      }
    }
  }
};

var Page = Class.create();
Page.prototype = {
  div: 0,
  initialize: function() {
    //var main = _getel('main');
    var div = _newdiv('page');
    _append( document.body, div );
    this.div = div;
  },
  is_full: function() {
    var h = this.height();
    return h > 1100;
  },
  height: function() {
    return this.div.offsetHeight;
  },
  append: function( x ) {
    return _append( this.div, x );
  },
  finalize: function() {
    this.div.className = 'page pageDone';
  }
};