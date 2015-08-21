var PageSpanner = Class.create();
PageSpanner.prototype = {
  curpage: 0,
  table: 0,
  bid: 0,
  rid: 0,
  delay_id: 0,
  pagenum: 0,
  curpage: 0,
  config: 0,
  container: 0,
  base: './',
  initialize: function( options, config ) {
    this.pagenum = 0;
    this.curpage = 0;
    this.page_tpl_func = options.page_tpl_generator || 0;
    this.tables = options.tables;
    this.config = config;
    if( options.container ) this.container = options.container;
    this.add_page();
    this.tocBuilder = new TocBuilder( this );
    this.rid = options.rid;
    if( options.base ) this.base = options.base;
  },
  add_page: function() {
    this.prevpage = this.curpage;
    if( this.curpage ) this.curpage.finalize();
    this.pagenum++;
    this.curpage = new Page( this.pagenum, this.page_tpl_func, this.config, this.container );
    if( this.prevpage ) this.shift_floating_headers();
  },
  shift_floating_headers: function() {
    if( !this.prevpage ) return;
    var div = this.prevpage.div;
    //if( this.pagenum == 15 ) debugger;
    var newdiv = this.curpage.div;
    var children = div.children;
    var i = children.length - 1;
    for( var i = children.length - 1; i >= 0; i-- ) {
      var child = children[ i ];
      if( child.nodeName == 'A' ) {
        var c1 = child.firstChild;
        if( c1 && ( c1.nodeName == 'H1' || c1.nodeName == 'H2' ) ) {
          if( newdiv.firstChild ) {
            newdiv.insertBefore( child, newdiv.firstChild );
          }
          else {
            newdiv.appendChild( child );
          }
        }
      }
      else if( child.nodeName == 'TABLE' ) {
        if( !child.firstChild ) { _del( child ); continue; }
        var c1 = child.firstChild;
        if( c1.nodeName == 'TBODY' && !c1.firstChild ) { _del( child ); continue; }
        break;
      }
      else {
        break;
      }
    }
  },
  add_item: function( item, delay, throwok ) {
    var n = item[0];
    var v = item[1];
    
    var html = '';
    var delayed = 0;
    
    if( this.noshow ) {
      if( n == 1 ) {
        var type = v[0];
        if( type == 'endif' || type == 'else' ) {
          this.noshow = 0;
        }
      }
      return {html:''};
    }
    
    if( n == 0 ) {
      if( delay ) html = v;
      else this.add_html( v, throwok );
    }
    if( n == 1 ) { // named
      var type = v[0];
      if( type == 'table' ) {
        var tname = v[1];
        var def = this.tables[ tname ];
        if(!def) console.log("Cannot find table named " + tname );
        else {
          if( delay ) {
            var newid = 'delay' + this.delay_id++;
            delayed = [ 1, [ 'tableid', newid, tname ] ];
            html = "<div id='" + newid + "'></div>";
          }
          else this.add_table( def );
        }
      }
      if( type == 'tableid' ) {
        var insertid = v[1];
        var tname = v[2];
        var def = this.tables[ tname ];
        if(!def) console.log("Cannot find table named " + tname );
        else {
          if(def) this.add_table_in_id( insertid, def, throwok );
        }
      }
      if( type == 'chart' ) {
        var cname = v[1];
        var subname = '';
        if( cname.match('-') ) {
          var parts = cname.split('-');
          cname = parts[0];
          subname = parts[1];
        }
        
        var tb = this.tables[ cname ];
        if(!tb) console.log("Cannot find table named " + cname );
        else {
          var xys = this.findxys( tb );
          if( xys ) {
            if( delay ) {
              var newid = 'delay' + this.delay_id++;
              delayed = [ 1, [ 'chartid', newid, v[1] ] ];
              html = "<div id='" + newid + "'></div>";
            }
            else {
              if( tb['chart'] ) {
                var charts = tb['chart'];
                for( var i=0;i<charts.length;i++ ) {
                  var chart = charts[i];
                  if( chart.name == subname || ( !chart.name && subname=='' ) ) this.add_graph( xys, chart, cname, 0 );
                }
              }
              else {
                this.add_graph( xys, 0, cname, 0 );
              }
            }
          }
        }
      }
      if( type == 'chartid' ) {
        var insertid = v[1];
        var cname = v[2];
        var subname = '';
        if( cname.match('-') ) {
          var parts = cname.split('-');
          cname = parts[0];
          subname = parts[1];
        }
        
        var tb = this.tables[ cname ];
        if(tb) {
          var xys = this.findxys( tb );
          if( xys ) {
            var charts = tb['chart'];
            for( var i=0;i<charts.length;i++ ) {
              var chart = charts[i];
              if( chart.name == subname || ( !chart.name && subname=='' ) ) {
                var graph = this.add_graph( xys, chart, cname, insertid, throwok );
                graph.style.marginLeft = 'auto';
                graph.style.marginRight = 'auto';
              }
            }
            
          }
        }
        if(!tb) console.log("Cannot find table named " + cname );
      }
      if( type == 'index' ) {
        var level = v[1];
        var name = v[2];
        var tpl = v[3];
        var html1 = this.tocBuilder.addItem( this.pagenum, level, name, tpl, delay );
        if( delay ) html = html1;
      }
      if( type == 'toc' ) {
        this.tocBuilder.addToc();
      }
      if( type == 'if' ) {
        var cond = v[1];
        if( !cond ) {
          this.noshow = 1;
          return {html:''};
        }
      }
      if( type == 'else' ) {
        // because we reached here, we are currently showing stuff
        this.noshow = 1;
        return {html:''};
      }
      if( type == 'newpage' ) {
        this.add_page();
        return {html:''};
      }
    }
    return {html:html,later:delayed};
  },
  // This function adds items that were already arranged into an array of 'pages'
  add_pages: function( pages ) {
    for( var i=0;i<pages.length;i++ ) {
      var page = pages[i];
      var last_page = ( i == pages.length-1 ) ? 1 : 0;
      this.add_items( page, last_page );
    }
  },
  add_items: function( r, last_page ) {
    for( var i=0;i<r.length;i++ ) {
      var part = r[ i ];
      var n = part[0];
      var v = part[1];
      if( n == 2 ) {
        var repeat = 1;
        while( repeat ) {
          repeat = 0;
          this.node_log = [];
          var node1 = 0;
          try {
            var len = v.length;
            var html = '';
            var delayed = [];
            for( var j=0;j<len;j++ ) {
              var item = v[ j ];
              var res = this.add_item( item, 1, 1 ); // 1st 1 means do_delay, 2nd 1 means throwok
              if( res.later ) delayed.push( res.later );
              if( res.html ) html += res.html;
            }
            var r1 = this.add_html( html, 2 ); // 1 means throw ok
            node1 = r1[0];
            if( r1[1] ) throw 'PageFull';
            if( delayed.length ) {
              for( var j=0;j<delayed.length;j++ ) {
                var item = delayed[ j ];
                this.add_item( item, 0, 1 );
              }
            }
          }
          catch( err ) {
            if( err == 'PageFull' ) {
              if( node1.parentNode) _del( node1 );
              this.add_page();
              repeat = 1;
              continue;
            }
            else throw err;
          }
        }
      }
      else this.add_item( part, 0 );
    }
    if( !last_page ) this.add_page();
  },
  fillToc: function() {
    this.tocBuilder.renderToc();
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
  add_html: function( html, throwok ) {
    var div = _newdiv();
    div.innerHTML = html;
    var n1 = 0;
    while( div.firstChild ) {
      var child = div.firstChild;
      if( !n1 && child.id ) { n1 = child; }
      this.curpage.append( child );
      if( this.curpage.is_full() ) {
        if( throwok == 1 ) {
          throw "PageFull";
        }
        if( throwok == 2 ) {
          return [ n1, 1 ];
        }
        this.add_page();
        this.curpage.append( child );
      }
    }
    if( throwok == 2 ) { return [ n1, 0 ]; }
    return n1;
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
    if( !this.curtbody ) {
      this.newTb();
    }
    _append( this.curtbody, tr );
    if( this.curpage.is_full() ) {
      if( tr.parentNode ) {
        var deltable = 0;
        if( tr == tr.parentNode.firstChild ) deltable = tr.parentNode;
        tr.parentNode.removeChild( tr );
        if( deltable ) _del( deltable );
      }
      if( !this.inserted_by_id ) {
        this.add_page();
        this.curtbody = this.add_empty_table();
      }
      callback();
      //_append( this.curtbody, tr );
    }
  },
  add_table_in_id: function( insertid, thash, throwok ) {
    this.curtbody = this.add_empty_table( insertid );
    var tob = new TableSys( thash, this, throwok );
    var tb1 = this.curtbody.parentNode;
    tob.render( this );
    //tb1.style.marginLeft = 'auto';
    //tb1.style.marginRight = 'auto';
    if( thash.islegend ) {
      tb1.style.width = '100%';
      tb1.style.marginBottom = '10px';
      tb1.style.marginTop = '-1px';
      tb1.style.marginLeft = '-1px';
      tb1.style.borderLeft = 0;
      tb1.style.borderRight = 0;
    }
  },
  add_table: function( thash ) {
    //this.curtbody = this.add_empty_table();
    var tob = new TableSys( thash, this );
    //var tb1 = this.curtbody;
    var table = tob.render( this );
    //return tb1.parentNode;
  },
  add_graph: function( xys, inf, tbname, insertid, throwok ) {
    var dataname = tbname;
    if( inf.name ) {
      tbname = name;
    }
    
    var div = _newdiv();
    var sp;
    if( insertid ) {
      sp = _getel( insertid );
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
    var morea = [];
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
      
      var more = {};
      if( xy.c ) more.c = xy.c;
      morea.push( more );
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
        var height = addops.height;
        var width = addops.width;
        
        var remain = this.curpage.remaining_height();
        if( ( remain < 0 || height > remain ) ) {
          _del( div );
          if( throwok ) {
            throw "PageFull";
          }
          this.add_page();
          if( !insertid ) this.add_graph( xys, inf, tbname, insertid );
          return;
        }
        if( type == 'pie' ) {
          div.style.width = '200px';//width + 'px';
          div.style.height = '130px';//height + 'px';
        }
        else {
          div.style.width = width + 'px';
          div.style.height = height + 'px';
        }
        
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
          series: series,
          more: morea
      }, ops );
    }
    if( type == 'pie' ) {
      /*series = series[0];
      for( var i in series ) {
        series[i] = series[i] * 1;
      }
      chart = new Chartist.Pie( ref, {
          //labels: xs,
          series: series,
          more: morea
      }, ops );*/
      var img = _newel('img');
      img.src = this.base + 'data/images/pie-'+this.rid+'-' + tbname + '.png';
      img.style.width = '200px';
      img.style.height = '130px';
      _append( div, img );
    }
    if( inf ) {
      if( inf.onDraw ) {
        var ofunc;
        eval( 'var ofunc = ' + inf.onDraw );
        if(chart) chart.on('draw', ofunc );
      }
    }
    
    return div;
  },
  add_empty_table: function( insertid ) {
    this.inserted_by_id = insertid || 0;
    var tb = _newtable();
    tb.table.cellPadding = 0;
    tb.table.cellSpacing = 0;
    //tb.table.border = '1';
    tb.table.className = 'mixed';
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
    if( this.curtbody && !this.curtbody.firstChild ) {
      return;
    }
    var bod = this.add_empty_table();
    this.curtbody = bod;
    return bod;
  }
};
var TocBuilder = Class.create();
TocBuilder.prototype = {
  pageSpanner: 0,
  items: 0,
  id: 0,
  initialize: function( pageSpanner ) {
    this.pageSpanner = pageSpanner;
    this.items = [];
    this.cascade = new DomCascade();
  },
  addItem: function( pagenum, level, text, html, delay ) {
    var id = ++this.id;
    //this.pageSpanner.add_html( "<a name='toc" + id + "'>" + html + "</a>" );
    var html1 = "<a name='toc" + id + "'>" + html + "</a>";
    if( delay ) return html1;
    else this.pageSpanner.add_html( html1 );
    this.items.push( { level: level, text: text, id: id, pagenum: pagenum } );
  },
  addToc: function() {
    this.pageSpanner.add_html( "<div id='toc'></div>" );
  },
  renderToc: function() {
    var toc = _getel('toc');
    
    var tb = _newtable('table');
    tb.table.className = 'toctable';
    tb.table.cellSpacing = 0;
    
    _append( toc, tb.table );
    
    var header = this.cascade.flow( {
      name: 'tr',
      sub: {
        name: 'td',
        attr: { colspan: 2 },
        'class': 'tableheader',
        sub: {
          name: 'text',
          text: 'Table of Contents'
        }
      }
    } );
    _append( tb.tbody, header.node );
    
    for( var i=0;i<this.items.length;i++ ) {
      var item = this.items[ i ];
      var level = item.level;
      
      var res = this.cascade.flow( {
        name: 'tr',
        sub: [
          { name: 'td',
            ref: 'td',
            'class': 'tocitem',
            sub: {
              name: "a",
              attr: {
                href: '#toc' + item.id
              },
              sub: {
                name: "text",
                text: item.text
              }
            }
          },
          { name: 'td',
            'class': 'tocnum',
            sub: {
              name: 'text',
              text: item.pagenum
            }
          }
        ]
      } );
      
      _append( tb.tbody, res.node );
      
      if( level == 2 ) {
        res.refs.td.style.paddingLeft = '50px';
      }
    }
  }
};
var TableSys = Class.create();
TableSys.prototype = {
  def: 0,
  spanner: 0,
  levelStack: 0,
  throwok: 0,
  initialize: function( def, spanner, throwok ) {
    this.def = def;
    this.spanner = spanner;
    this.levelStack = [];
    this.throwok = throwok || 0;
  },
  render: function() {
    var root = new TableLevel( this.def, this.spanner, this, 0, this.throwok );
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
  throwok: 0,
  initialize: function( def, spanner, sys, levelId, throwok ) {
    this.def = def;
    this.spanner = spanner;
    this.sys = sys;
    this.levelId = levelId;
    this.shownHeaders = [];
    this.throwok = throwok;
  },
  render: function() {
    if( this.def.pre ) this.spanner.add_html( this.def.pre, 1 );
    if( this.def.header ) this.renderHeaders( this.def.header );
    if( this.def.detail ) this.renderDetail( this.def.detail );
    if( this.def.groups ) this.renderGroups( this.def.groups );
    if( this.def.footer ) this.renderHeaders( this.def.footer );
  },
  renderDetail: function( headers ) {
    var dokill = 1;
    for( var i in headers ) {
      var header = headers[ i ];
      var tr = _newel('tr');
      tr.innerHTML = header;
      var self = this;
      this.sys.addTr( tr, function() {
          if( self.throwok ) throw "PageFull";
          var showLevel;
          if( self.levelId > 0 ) {
            var maxShow = self.levelId - 1;
            for( var showLevel = 0; showLevel <= maxShow; showLevel++ ) {
              var above = self.sys.getLevel( showLevel );
              if( above.def.header ) {
                above.killHeaders();
                above.renderHeaders( above.def.header );
              }
            }
          }
          if( self.def.header ) {
            if( dokill ) self.killHeaders();
            self.renderHeaders( self.def.header );
          }
          self.sys.addTr( tr );
      } );
      dokill = 0;
    }
  },
  killHeaders: function() {
    var deltable = 0;
    for( var i=0;i<this.shownHeaders.length;i++ ) {
      var h = this.shownHeaders[ i ];
      var parent = h.parentNode;
      if( h == h.parentNode.firstChild ) deltable = parent;
      parent.removeChild( h );
      if( !parent.firstChild ) deltable = parent;
    }
    if( deltable ) _del( deltable );
    this.shownHeaders = [];
    this.spanner.shift_floating_headers();
  },
  renderHeaders: function( headers ) {
    var nofit = 0;
    
    var heads = [];
    var dokill = 1;
    for( var i in headers ) {
      var header = headers[ i ];
      var tr = _newel('tr');
      //var levelEmpty = (this.shownHeaders.length == 0);
      this.shownHeaders.push( tr );
      heads.push (tr );
      tr.innerHTML = header;
      var self = this;
      //var doKill = ( i == 0 ) ? 1 : 0;
      
      this.sys.addTr( tr, function( levelEmpty ) {
          nofit = 1;
          /*
          var showLevel;
          if( self.levelId > 0 ) {
            var maxShow = self.levelId - 1;
            /for( var showLevel = maxShow; showLevel >= 0; showLevel-- ) {
              var showLevel = maxShow;
              var above = self.sys.getLevel( showLevel );
              if( doKill ) { above.killHeaders(); doKill = 0; }
            }/
            
            for( var showLevel = 0; showLevel <= maxShow; showLevel++ ) {
              var above = self.sys.getLevel( showLevel );
              if( above.def.header ) above.renderHeaders( above.def.header );
            }
          }*/
      } );
      
      if( nofit ) {
        if( this.throwok ) throw "PageFull";
        break;
      }
      else {
        if( self.levelId > 0 ) {
          var maxShow = self.levelId - 1;
          for( var showLevel = 0; showLevel <= maxShow; showLevel++ ) {
            var above = self.sys.getLevel( showLevel );
            //above.shownHeaders = [];
          }
        }
      }
    }
    
    if( nofit ) {
      for( var i=0;i<heads.length;i++ ) {
        var head = heads[i];
        if( head.parentNode ) _del( head );
      }
      if( self.levelId > 0 ) {
        var maxShow = self.levelId - 1;
        for( var showLevel = 0; showLevel <= maxShow; showLevel++ ) {
          var above = self.sys.getLevel( showLevel );
          if( above.def.header ) {
            above.killHeaders();
            above.renderHeaders( above.def.header );
          }
        }
      }
      this.renderHeaders( headers );
    }
  },
  renderGroups: function( groups ) {
    for( var i in groups ) {
      var group = groups[i];
      var sets = group.sets;
      for( var j in sets ) {
        var set = sets[j];
        if( group.use_new_table ) {
          this.sys.newTb();
        }
        var level = new TableLevel( set, this.spanner, this.sys, this.levelId + 1, this.throwok );
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
  pagenum: 0,
  baseHeight: 0,
  config: 0,
  initialize: function( pagenum, page_tpl_func, config, container ) {
    //var main = _getel('main');
    this.pagenum = pagenum;
    this.config = config;
    if( pagenum > 50 ) console.break();
    this.tpl_func = page_tpl_func;
    var div = _newdiv('page');
    _append( container ? container : document.body, div );
    
    if( page_tpl_func ) {
      this.div = page_tpl_func( div, config, pagenum );
    }
    else this.div = div;
    
    this.baseHeight = this.div.offsetHeight;
    this.div.style.height = 0;
    this.div.style.minHeight = 0;
    this.outer = div;
  },
  is_full: function() {
    var h = this.height();
    return h > this.baseHeight;
  },
  remaining_height: function() {
    var h = this.height();
    return this.baseHeight - h;
  },
  height: function() {
    return this.div.scrollHeight;
  },
  append: function( x ) {
    return _append( this.div, x );
  },
  finalize: function() {
    this.outer.className = 'page pageDone';
  }
};