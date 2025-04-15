using System;
using System.Collections.Generic;

namespace WebBaoDienTu.Models;

public partial class Category
{
        public int CategoryId { get; set; }
        public string CategoryName { get; set; } = null!;

    public virtual ICollection<News> News { get; set; } = new List<News>();
}
