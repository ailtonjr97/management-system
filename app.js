//jshint esversion:6
const crc16kermit = require('crc/crc16kermit');
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const ejs = require("ejs");
const _ = require("lodash");
const session = require('express-session')
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose')
const axios = require('axios');
var findOrCreate = require('mongoose-findorcreate')
var fs = require("fs");
const path = require("path");
const formidable = require('formidable');
const upload = require ('express-fileupload')
var nodemailer = require('nodemailer');
const puppeteer = require('puppeteer');
require('dotenv').config()

const app = express();


app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use((req, res, next) =>{
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE');

  next();
})


app.use(session({
  secret: process.env.PASSWORD,
  resave: false,
  saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(upload());


mongoose.connect(process.env.MONGOSTRING);


const userSchema = new mongoose.Schema({
  nome: String,
  name: String,
  email: String,
  password: String,
  googleId: String,
  setor: Array,
  cargo: Array,
  dadosPessoais: Array,
  unidade: Array,
  realNome: String
});

const produtoSchema = new mongoose.Schema({
  nome: String,
  descri: String,
  codigo: String,
  tipo: String,
  ncm: Number,
  quantidade: Number,
  lote: Array,
  gtin: Number,
  un: String, 
  grupo: String,
  utilizacao: String,
  familia: String,
  origem: String,
  nf: Number,
  anexoNome: String,
  ipi: Number,
  icms: Number,
  cofins: Number,
});

const maquinaSchema = new mongoose.Schema({
  nome: String,
});

const chamadoSchema = new mongoose.Schema({
  idChamado: Number,
  setor: String,
  descri: String,
  empresa: String,
  urgencia: String,
  area: String,
  atividade: String,
  impacto: String,
  designado: String,
  requisitante: String,
  designado: String,
  listaAprovadores: Array,
  anexoNome: String,
  resposta: String,
  arquivado: String,
});

const pontoSchema = new mongoose.Schema({
  campo1: String,
  campo2: String,
  campo3: String,
  campo4: String,
  campo5: String,
  campo6: String,
  campo7: String,
  campo8: String,
  campo9: String,
});

const anexoSchema = new mongoose.Schema({
  img: {
    data: String,
    contentType: String
  }
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = mongoose.model('User', userSchema);
const Produto = mongoose.model('Produto', produtoSchema);
const Maquina = mongoose.model('Maquina', maquinaSchema);
const Chamado = mongoose.model('Chamado', chamadoSchema);
const Ponto = mongoose.model('Ponto', pontoSchema);
const Anexo = mongoose.model("Anexo", anexoSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, done){
  done(null, user.id)
})

passport.deserializeUser(function(id, done){
  User.findById(id, function(err, user){
    done(err, user);
  })
});


////////////////////////////////////////////////////////////
app.get('/', function(req, res){
  res.render('home');
})
///////////////////////////////////////////////////////////////
app.get('/login', function(req, res){
  res.render('login');
})

app.post('/login', function(req, res){
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });

  req.login(user, function(err){
    if(err){
      res.send('Erro')
    } else{
      passport.authenticate('local')(req, res, function(){
        if(user){
          res.redirect('/inicio')
        } else{
          res.send('Negative')
        }
      })
    }
  })

});
///////////////////////////////////////////////////////////////
app.get('/register', function(req, res){
  if(req.isAuthenticated()){
    Chamado.find(function(err, chamado) {
      res.render("register", {
        user: req.user.realNome,
        chamado: chamado,
        logado: req.user.realNome
      });
  })
  }else{
    res.redirect('/login')
  }
});

app.post('/register', function(req, res){
  User.register({username: req.body.username}, req.body.password, function(err, user){
    if(err){
      res.send(err)
    } else{
      User.updateMany(
        {"username": req.body.username },
        {$set: {
          "realNome": req.body.realNome,
          'dadosPessoais': [{nascimento: req.body.data}, {cpf: req.body.cpf}, {rg: req.body.rg}],
          'setor': [{setorId: req.body.setores}, {setorDescri: req.body.setorDescri}],
          'cargo': [{cargoId: req.body.cargos}, {cargoDescri: req.body.cargoDescri}],
          'unidade': [{unidadeId: req.body.unidade}, {unidadeDescri: req.body.unidadeDescri}]
        }
        },
        {
            returnNewDocument: true
        }
    , function( error, result){
      if(error){
        res.send('erro1')
      } else{
        passport.authenticate('local')(req, res, function(){
          res.redirect('/inicio')
        })
      }
    });
    }
  })

  })
///////////////////////////////////////////////////////////////
app.get('/inicio', function(req, res){
  if(req.isAuthenticated()){
    Chamado.find(function(err, chamado) {
      res.render("inicio", {
        user: req.user.realNome,
        chamado: chamado,
        logado: req.user.realNome
      });
  })
  }else{
    res.redirect('/login')
  }
});
///////////////////////////////////////////////////////////////
app.get('/submit', function(req, res){
  res.render('submit');
});
///////////////////////////////////////////////////////////////
app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
})
/////////////////////////////////////////////////////////
app.get('/ativos', function(req, res){
  if(req.isAuthenticated()){
    Chamado.find(function(err, chamado) {
      User.find(function (error, user) {
        res.render("ativos", {
          chamado: chamado,
          usuario: user,
          logado: req.user.realNome
        });
    });
  });
  }else{
    res.redirect('/login')
  }
})
/////////////////////////////////////////////////////////
app.get("/dados/:dadosId", function(req, res){
  if(req.isAuthenticated()){
    User.findOne({_id: req.params.dadosId}, function(err, usuario){
      res.render('dados', {
        userId: usuario._id,
        username: usuario.username,
        nome: usuario.dadosPessoais[0].nome,
        data: usuario.dadosPessoais[1].nascimento,
        cpf: usuario.dadosPessoais[2].cpf,
        rg: usuario.dadosPessoais[3].rg,
        setor: usuario.setor[1].setorDescri,
        cargo: usuario.cargo[1].cargoDescri,
        unidade: usuario.unidade[1].unidadeDescri
      })
    });
  }else{
    res.redirect('/login');
  }
})

app.post("/dados", function(req, res){
  User.updateMany(
    {"username": req.body.username },
    {$set: {
      'dadosPessoais': [{nome: req.body.nome}, {nascimento: req.body.data}, {cpf: req.body.cpf}, {rg: req.body.rg}],
      'setor': [{setorId: req.body.setores}, {setorDescri: req.body.setorDescri}],
      'cargo': [{cargoId: req.body.cargos}, {cargoDescri: req.body.cargoDescri}],
      'unidade': [{unidadeId: req.body.unidade}, {unidadeDescri: req.body.unidadeDescri}]
    }
    },
    {
        returnNewDocument: true
    }
, function( error, result){
  if(error){
    res.send('erro1')
  } else{
    res.redirect('/inicio')
  }
});
})
//////////////////////////////////////////////////////////////////////
//Delete usuários da página dados.
app.post('/deleteUser', function(req, res){
  User.deleteOne({username: req.body.username}, function(err){
    if(err){
      console.log(err)
      res.send('Erro ao excluir')
    } else {
      res.redirect('/ativos')
    }
  })
})
//////////////////////////////////////////////////////////////////////
/* app.get("/testepag", function(req, res){
  axios
  .get('http://192.168.0.88/video/chamada/7706605042?pwd=Q3dxU002L2Z3REFyZW5ndldVY0FnZz09')
  .then(res => {
    console.log(res.data);
  })
  .catch(error => {
    console.error(error);
  });
}); */
///////////////////////////////////////////////
app.get('/chamadomarketing', function(req, res){
  if(req.isAuthenticated()){
    Chamado.find(function(err, chamado) {
      res.render("chamadomarketing", {
        user: req.user.realNome,
        chamado: chamado,
        logado: req.user.realNome
      });
  }).sort({_id:-1}).limit(1);
  }else{
    res.redirect('/login')
  }
})

app.get('/public/anexos/:anexoNome', function(req, res){
  if(req.isAuthenticated()){
    var options = {
      root: path.join(__dirname + "\\public\\anexos")
  };
   
  var fileName = req.params.anexoNome;
  res.sendFile(fileName, options, function (err) {
      if (err) {
          res.send(err);
      }
  });
  }else{
    res.redirect('/login')
  }
})

app.get('/public/anexos/produtos/:anexoNome', function(req, res){
  if(req.isAuthenticated()){
    var options = {
      root: path.join(__dirname + "\\public\\anexos\\produtos")
  };
   
  var fileName = req.params.anexoNome;
  res.sendFile(fileName, options, function (err) {
      if (err) {
          res.send(err);
      }
  });
  }else{
    res.redirect('/login')
  }
})

app.post("/chamadomarketing", function(req, res){
  if(req.files){
    let file = req.files.postImage
    let filename = file.name
        Chamado.countDocuments({}, function (err, count) {
          if (err){
              console.log(err)
          }else{
            let count2 = count + 1
            file.mv('./public/anexos/' + count2 + "-" + filename, function(err){
              if (err){
                res.send("Erro ao subir arquivo. Favor abrir chamado.")
              }else{
                const chamado = new Chamado({
                  idChamado: count2,
                  setor: req.body.setor,
                  descri: req.body.descri,
                  empresa: req.body.empresa,
                  urgencia: req.body.urgencia,
                  area: req.body.area,
                  atividade: req.body.atividade,
                  requisitante: req.body.requisitante,
                  designado: '',
                  anexoNome: count2 + "-" + filename,
                  resposta: '',
                  arquivado: '',
                })
                chamado.save(function(err){
                  if(err){
                  } else {
                    res.redirect('/verchamadomkt');
                  };
                });
              }})
          }
      });
  } else{
    Chamado.countDocuments({}, function (err, count) {
      if (err){
          console.log(err)
      }else{
        let count2 = count + 1
        const chamado = new Chamado({
          idChamado: count2,
          setor: req.body.setor,
          descri: req.body.descri,
          empresa: req.body.empresa,
          urgencia: req.body.urgencia,
          area: req.body.area,
          atividade: req.body.atividade,
          requisitante: req.body.requisitante,
          designado: '',
          anexoNome: '',
          resposta: '',
          arquivado: '',
        })
        chamado.save(function(err){
          if(err){
          } else {
            res.redirect('/verchamadomkt');
          };
        });
      }
  });
  }
});
/////////////////////////////////////////////////////////////////////
app.get("/verchamadomkt", (req, res) => {
  if(req.isAuthenticated()){
  Anexo.find({}, function(err, anexo) {
    Chamado.find(function(err, chamado) {
      User.find(function (error, user) {
        res.render("verchamadomkt", {
          anexo: anexo,
          chamado: chamado,
          user: user,
          logado: req.user.realNome
        });
    });
  })});
  }else{
    res.redirect('/login')
  }
});

app.post("/verchamadomkt", function(req, res){
  Chamado.updateMany(
    {"_id": req.body.idChamadoPost },
    {$set: {
      'empresa': req.body.empresa,
      'urgencia': req.body.urgencia,
      'area': req.body.area,
      'atividade': req.body.atividade,
      'designado': req.body.designado,
      'resposta': req.body.resposta,
      'arquivado': req.body.arquivado,
    }
    },
    {
        returnNewDocument: true
    },
function( error, result){
  if(error){
    res.send(error)
  } else{
    res.redirect('/verchamadomkt')
  }
});
})

app.post("/aprovverchamadomkt", function(req, res){
  Chamado.updateMany(
    {"_id": req.body.idChamadoPost },
    {
      $push: {'listaAprovadores': [{nome: req.body.aprovador}, {status: 'Em aprovação'}]},
    },
    {
        returnNewDocument: true
    }, 
function( error, result){
  if(error){
    res.send(error)
  } else{
    res.redirect('/verchamadomkt')
  }
});
})

//////////////////////////////////////////////////////////////////////////////////////
app.get("/meuschamadosmkt", (req, res) => {
  if(req.isAuthenticated()){
    Chamado.find(function(err, chamado) {
      User.find(function (error, user) {
        res.render("meuschamadosmkt", {
          chamado: chamado,
          user: user,
          logado: req.user.realNome
        });
    });
  });
  }else{
    res.redirect('/login')
  }
});
//////////////////////////////////////////////////////////////////////////////////////
app.get("/ponto", (req, res) => {
  crc16kermit('123456789').toString(16)

  if(req.isAuthenticated()){
    Ponto.find(function(err, ponto) {
      User.find(function (error, user) {
        res.render("ponto", {
          ponto: ponto,
          user: user,
          logado: req.user.realNome
        });
    });
  });
}else{
  res.redirect('/login')
}
});

app.post("/pontoRegistra", function(req, res){
  const ponto = new Ponto({
    campo1: '000000000',
    campo2: '1',
    campo3: '1',
    campo4: '02010281000199',
    campo5: '              ',
    campo6: 'FIBRACEM TELEINFORMATICA LTDA                                                                                                                         ',
    campo7: 'RegistroINPI     ',
    campo8: req.body.campo8,
    campo9: req.body.campo9,
  })
  ponto.save(function(err){
    if(err){
      console.log(err);
    } else {
      res.redirect('/ponto');
    }
  });
})
/////////////////////////////////////////////////////////////////////////////////////
app.get("/aprovChamados", (req, res) => {
  if(req.isAuthenticated()){
    Chamado.find(function(err, chamado) {
      User.find(function (error, user) {
        res.render("aprovchamados", {
          chamado: chamado,
          user: user,
          logado: req.user.realNome
        });
    });
  });
  }else{
    res.redirect('/login')
  }
});

app.post("/respostaAprovChamado", function (req, res) {
  if (req.isAuthenticated()) {
    const updatePromises = [];
    for (let i = 0; i < req.body.indiceAprov; i++) {
      updatePromises.push(Chamado.updateOne(
        { "_id": req.body.idChamadoPost, ["listaAprovadores." + i + ".nome"]: req.user.realNome },
        {
          $set: { ["listaAprovadores." + i]: [{ nome: req.user.realNome }, { status: req.body.respostaAprov }] }
        },
        {
          returnNewDocument: true
        }))
    };
    Promise.all(updatePromises)
      .then(result => res.redirect('/aprovChamados'))
      .catch(error => res.send(error))
  } else {
    return res.redirect('/login')
  }
})

app.get("/testaEmail", (req, res) => {

  async function main() {

    let transporter = nodemailer.createTransport({
      host: "outlook.maiex13.com.br",
      port: 587,
      secure: false, 
      auth: {
        user: "informatica04@fibracem.com", 
        pass: "Fibracem@2021", 
      },
    });
  
    let info = await transporter.sendMail({
      from: '"Ailton" informatica04@fibracem.com', 
      to: "sistema@fibracem.com", 
      subject: "Teste email", 
      text: "Teste", 
      html: "<b>Hello world?</b>", 
    });
  }
  
  main().catch(console.error);
});

//////////////////////////////////////////////////////////////////////////////////////
app.get("/cadastroproduto", (req, res) => {
  if(req.isAuthenticated()){
    Chamado.find(function(err, chamado) {
      User.find(function (error, user) {
        res.render("cadastroproduto", {
          chamado: chamado,
          user: user,
          logado: req.user.realNome
        });
    });
  });
  }else{
    res.redirect('/login')
  }
});

app.post("/cadastroproduto", function(req, res){
  if(req.files){
    let file = req.files.postImage
    let filename = file.name
        Produto.countDocuments({}, function (err, count) {
          if (err){
              console.log(err)
          }else{
            let count2 = count + 1
            file.mv('./public/anexos/produtos/' + count2 + "-" + filename, function(err){
              if (err){
                res.send("Erro ao subir arquivo. Favor abrir chamado.")
              }else{
                const produto = new Produto({
                  nome: req.body.nome,
                  descri: req.body.descri,
                  codigo: req.body.codigo,
                  tipo: req.body.tipo,
                  ncm: req.body.ncm,
                  gtin: req.body.gtin,
                  grupo: req.body.grupo,
                  un: req.body.un,
                  utilizacao: req.body.utilizacao,
                  familia: req.body.familia,
                  anexoNome: count2 + "-" + filename,
                  origem: req.body.familia,
                  ipi: req.body.ipi,
                  icms: req.body.icms,
                  cofins: req.body.cofins,
                })
                produto.save(function(err){
                  if(err){
                  } else {
                    res.redirect('/produtos');
                  };
                });
              }})
          }
      });
  } else{
    Produto.countDocuments({}, function (err, count) {
      if (err){
          console.log(err)
      }else{
        let count2 = count + 1
        const produto = new Produto({
          nome: req.body.nome,
          descri: req.body.descri,
          codigo: req.body.codigo,
          tipo: req.body.tipo,
          ncm: req.body.ncm,
          gtin: req.body.gtin,
          grupo: req.body.grupo,
          un: req.body.un,
          utilizacao: req.body.utilizacao,
          familia: req.body.familia,
          origem: req.body.origem,
          anexoNome: 'default-placeholder.png',
          ipi: req.body.ipi,
          icms: req.body.icms,
          cofins: req.body.cofins,
        })
        produto.save(function(err){
          if(err){
          } else {
            res.redirect('/produtos');
          };
        });
      }
  });
  }
});

//////////////////////////////////////////////////////////////////////////////////////
app.get("/produtos", (req, res) => {
  if(req.isAuthenticated()){
    Chamado.find(function(err, chamado) {
      User.find(function (error, user) {
        Produto.find(function (error, produto) {
          res.render("produtos", {
            chamado: chamado,
            user: user,
            logado: req.user.realNome,
            produtos: produto
          });
        });
    });
  });
  }else{
    res.redirect('/login')
  }
});
//////////////////////////////////////////////////////////////////////////////
app.post("/alteraProduto", function(req, res){
  Produto.updateMany(
    {"_id": req.body.idProdutoPost},
    {$set: {
      'descri': req.body.descri,
      'codigo': req.body.codigo,
      'tipo': req.body.tipo,
      'ncm': req.body.ncm,
      'gtin': req.body.gtin,
      'grupo': req.body.grupo,
      'un': req.body.un,
      'utilizacao': req.body.utilizacao,
      'familia': req.body.familia,
      'origem': req.body.origem,
    }
    },
    {
        returnNewDocument: true
    },
function( error, result){
  if(error){
    res.send(error)
  } else{
    res.redirect('/produtos')
  }
});
})
////////////////////////////////////////////////////////////////////////
function roboTOTVS(){
  (async () => {
    const browser = await puppeteer.launch({
   // executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: false,
     });
  
     function delay(time) {
      return new Promise(function(resolve) { 
          setTimeout(resolve, time)
      });
    }
     const page = await browser.newPage();
     const page2 = await browser.newPage();
  
     await page.setViewport({ width: 1600, height: 800 })
  
     await page.goto('https://isscuritiba.curitiba.pr.gov.br/iss/default.htm')
     await delay(2000);
     const pages2 = await browser.pages(); // get all open pages by the browser
     const popup = pages2[pages2.length - 1]; // the popup should be the last page opened
     await delay(1000);
     await popup.type('#txtLogin', 'pharuss');
     
     })();
    }
////////////////////////////////////////////////////////////////////////////////////////


//////////////////////////////////////////////////////////////////////////////////////
app.listen(5000, function() {
  console.log("Server started on port 5000");
});

