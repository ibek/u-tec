firebase().database().ref('/tactical-plans/').orderByChild('viewed').startAt('2017/05/20').endAt('2017/09/19').on('child_added', (snapshot) => {
     snapshot.ref.remove()
})
