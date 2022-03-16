let qtdLetters = document.getElementById('qtd-letters').textContent
let word = document.getElementById('word').value

let arrayWord = []

for (let i = 0; i < qtdLetters; i++) {
    arrayWord.push(word[i])
}

for (let i = 0; i < qtdLetters; i++) {
    let span = document.createElement("span")
    span.setAttribute("id", i)
    span.setAttribute("class", "response")
    document.getElementById("response").appendChild(span)
    span.innerHTML = "."
}

function checkLetter(letter){
    let chances = Number(document.getElementById('chances').textContent)

    let check = arrayWord.find(l => 
        l == letter
    )
    
    if(typeof check !== 'undefined'){
        for (let i = 0; i < qtdLetters; i++) {
            if(arrayWord[i] == letter) {
                document.getElementById(i).innerHTML = arrayWord[i]
            }
            document.getElementById(letter).style.visibility = "hidden"
        }   
        let response = document.getElementsByClassName('response')
        let sum = 0
        for (let i = 0; i < qtdLetters; i++) {
            if(response[i].textContent != '.'){
                sum++
            }
        }
        if(sum == qtdLetters){
            document.getElementById('message').setAttribute('class', 'alert alert-success')
            document.getElementById('message').innerHTML = 'You win!'
            document.getElementById('game').style.pointerEvents = 'none'
        }
    }else{
        chances = chances - 1
        document.getElementById('chances').innerHTML = chances
        document.getElementById(letter).style.visibility = "hidden"
        if(chances == 0){
            document.getElementById('chances').innerHTML = 0
            document.getElementById('message').setAttribute('class', 'alert alert-danger')
            document.getElementById('message').innerHTML = 'You loose'
            document.getElementById('game').style.pointerEvents = 'none'
        }
    }
}
